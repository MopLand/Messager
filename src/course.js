'use strict'

/**
 * 微信群课程
 */

const wx = require('../lib/weixin');
const com = require('../lib/common');
const req = require('../lib/request');
const Logger = require('../lib/logger');
const tag = com.fileName( __filename, false );
const log = new Logger( tag );

class Course {

	/**
	 * 构造函数
	 */
	constructor(conf) {
		this.inst = {};
		this.conf = conf;
		this.wx = new wx( conf.weixin, conf.reserve, conf.special );
		this.redis = com.redis(conf.redis);
		this.sider = com.redis(conf.redis);
		this.mysql = com.mysql(conf.mysql, (db => { this.mysql = db; }).bind(this));
		this.members = [];
	}

	init( item = 'course' ){

		var conf = this.conf;
		var inst = this.conf[item];

		//监听的微信号
		var wechat = inst.wechat || conf.wechat;

		//消息时间戳
		var marker = inst.marker || 'mm_course_id';

		//Redis消息频道
		var channel = inst.channel || 'mm_course';

		///////////////

		//消息筛选条件
		var where = {}

		this.inst = inst;

		if( inst.follow ){
			where.fromUserName = inst.follow;
		}

		if( inst.talker ){
			where.speaker = inst.talker + ':\n';
		}

		if( inst.detect ){
			where.allowed = inst.detect;
		}

		this.where = where;
		
		log.info( '监听条件', { where, instance : inst } );

		///////////////

		//订阅消息发送
		this.subscribe( wechat, marker, channel );

	}

	/**
	 * 订阅消息
	 * @param string 微信ID
	 * @param string 消息标记
	 * @param string 消息频道
	 */
	subscribe( wechat, marker, channel ) {

		let self = this;

		//最近一次微信群消息ID
		this.sider.get( marker, ( err, ret ) => {
			self.keybuf = ret || '';
		} );

		//处理 Redis 消息
		this.redis.on('message', function (channel, message) {

			let recv = JSON.parse( message );

			//播放教程
			//member { member_id, weixin_id, group_id }
			if( recv.event == 'play' ){
				self.forwardMessage( recv.member, recv.course_id );
			}

			//存储教程
			if( recv.event == 'save' ){
				self.collectMessage( wechat, recv.msgid );
			}

		});

		//订阅 Redis 频道消息
		this.redis.subscribe( channel );

	}

	/**
	 * 消息拉取器
	 * @param integer 消息ID
	 * @param object 前置消息
	 */
	collectMessage( wechat, msgid, front ){

		let self = this;
		let pm = self.wx.NewSync( wechat, self.keybuf );

		pm.then(ret => {

			log.info( '原始消息', ret.cmdList.list );

			//获取最新消息
			var data = self.filterMessage( msgid, ret.cmdList.list, self.where );
			var size = data.message.length;
			var find = false;

			//发送最新消息
			if( size ){
				self.send( data );
				find = data.message.find( ele => {
					return ele.rowid == msgid;
				} );
			}
			
			log.info( '消息数量', { '通知ID' : message, 'Continue' : ret.continueFlag, '原消息' : ret.cmdList.count, '筛选后' : size } );
			log.info( '有效消息', data );

			//连接前后消息
			if( front ){
				data = front.concat( data );
			}
			
			//记录消息标记
			self.keybuf = ret.keyBuf.buffer;

			//临时存储一天
			self.sider.set( marker, keybuf );
			self.sider.expire( marker, 3600 * 14 );

			//还有未读消息
			if( ret.continueFlag && !find ){
				self.collectMessage( wechat, msgid, data );
			}else{
				self.archiveMessage( data );
			}

			req.status(self.conf.report, 'MM_Course', size, { '原始消息' : ret.cmdList.count, '通知ID' : message, '拉取ID' : find } );

		}).catch(err => {

			log.info( '读取错误', err );

			req.status(self.conf.report, 'MM_Course', 500, err);

		}).finally( () => {

		});

	}

	/**
	 * 消息过滤器
	 * @param string 消息包ID
	 * @param object 消息数据
	 * @param object 过滤条件
	 * @param integer 返回数据，-1 全返回，1 仅返回单条
	 */
	filterMessage( pakId, msgs, where = {}, limit = -1 ) {

		//消息列表，{ msgid, msgtype, content, source }
		var data = [];

		for (let i = 0; i < msgs.length; i++) {

			var size = 0;
			var item = msgs[i].cmdBuf;
			let text = item.content.string;

			//撤回消息，查找之前的 rowid 并过滤掉 
			if( item.msgType == 10002 ){

				let rawid = com.match( text, /<newmsgid>(.+?)<\/newmsgid>/, 1 );

				if( rawid ){

					log.info('撤回消息', { 'rawid' : rawid, 'text' : text } );

					data.message = data.message.filter( ele => {
						return ele.rowid != rawid;
					} );

				}
				
			}

			//支持的消息类型：1 文字、3 图片、43 视频、47 表情、49 小程序
			if( [1, 3, 43, 47, 49].indexOf( item.msgType ) == -1 ){
				continue;
			}
			
			for (let w in where) {

				switch( w ){

					//谁说的活
					case 'speaker':
						size += text.indexOf( where[w] ) === 0 ? 1 : 0;
					break;

					//允许的文本
					case 'allowed':
						size += ( item.msgType != 1 || where[w].test( text ) ) ? 1 : 0;
					break;

					//其他字段
					default:
						size += ( item[w].string == where[w] ) ? 1 : 0;
					break;

				}

			};

			//群消息，过滤 xxx:\n
			if( /@chatroom$/.test( item.fromUserName.string ) ){
				text = text.replace(/^[0-9a-zA-Z_\-]{1,}:\n/, '');
			}

			//小程序，过滤 mmlive
			if( /<mmlive>/.test( text ) ){
				text = text.replace(/<mmlive>(.+?)<\/mmlive>/g, '');
			}

			//小程序，匹配 白名单
			if( /<appid>/.test( text ) && this.conf.minapp ){

				let appid = /<appid>(.+?)<\/appid>/.exec( text )[1];
				let allow = this.conf.minapp.indexOf( appid ) >= 0;
				
				log.info('小程序', { 'appid' : appid, 'allow' : allow, 'struct' : text });

				if( !allow ){
					continue;
				}
			}

			//满足所有条件
			if (size == Object.keys(where).length) {
				data.push( { msgid : item.msgId, rowid : item.newMsgId, msgtype : item.msgType, content : text, source : item.msgSource });
			}

		};

		//只取一条时，直接返回消息体
		if (limit == 1) {
			return data.length ? data[0] : null;
		} else {
			return data;
		}

	}

	/**
	 * 将消息存档
	 * @param object 消息数据
	 */
	archiveMessage( data ){
		
		let then = new Date();
		let kbid = null;

		var func = ( ) => {
			
			let time = then.getTime() / 1000;
			let date = then.format('yyyyMMdd');
			let item = kbid ? data.shift() : data[0];
			let text = kbid ? JSON.stringify( item ) : item.content;

			this.mysql.query('INSERT INTO `pre_course_weixin` (course_id, content, catalog, created_time, created_date) VALUES(?, ?, ?, ?)', [ kbid, text, ( kbid ? 0 : 1 ), time, date ], function (err, res) { 

				if( err ){
					log.error( err );
					return;
				}

				if( !kbid ){
					kbid = res.insertId;
				}

				if( data.length > 0 ){
					setTimeout( () => { func(); }, 1000 );
				}else{
					log.info('入库完毕', { course_id } );
				}

			} );

		}

		func();

	}

	/**
	 * 转发群消息
	 * @param object 用户信息
	 * @param integer 课程ID
	 */
	forwardMessage( member, course_id ) {

		var self = this;

		self.mysql.query('SELECT content FROM `pre_course_weixin` WHERE course_id = ? ORDER BY auto_id ASC', [course_id], function (err, res) {

			if( err ){
				log.error( err );
				return;
			}

			/////////////////////

			log.info( '当前微信', { '用户ID' : member.member_id, '微信号' : member.weixin_id, '微信群' : member.group_id, '消息量' : res.length } );

			var func = ( ) => {

				let row = res.shift();
				let res = self.sendMsg( member, JSON.parse( row.content ) );

				res.then(ret => {

					//消息包未完成
					if( res.length > 0 ){
						setTimeout( () => { func(); }, 3500 );
					}else{
						log.info('群发完毕', { member, course_id } );
					}

				});

			};

			func();

		});

	}

	/**
	 * 转发群消息
	 * @param object 用户数据
	 * @param object 单条消息
	 */
	sendMsg( member, msg ){

		var self = this;
		var detail = msg.content;

		//文本
		if ( msg.msgtype == 1 ) {

			let fn = this.wx.NewSendMsg(member.weixin_id, member.group_id, detail, msg.source);

			fn.then(ret => {
				log.info('文本成功', [member, ret.count]);
			}).catch(err => {
				log.error('NewSendMsg', [member, err]);
			});

			return fn;

		}

		//小程序 替换UID
		if( msg.msgtype == 49 ){
			detail = detail.replace(/userid=(\d*)/g, 'userid=' + member.member_id);
		}

		//图片
		if( msg.msgtype == 3 ){

			var fn = this.wx.UploadMsgImgXml(member.weixin_id, member.group_id, detail);

			fn.then(ret => {
				log.info('发图成功', [member, ret.msgId]);
			}).catch(err => {
				log.error( 'UploadMsgImgXml', [member, err]);
			});
		}

		//视频
		if( msg.msgtype == 43 ){

			var fn = this.wx.UploadVideoXml(member.weixin_id, member.group_id, detail);

			fn.then(ret => {
				log.info('视频成功', [member, ret.msgId]);
			}).catch(err => {
				log.error( 'UploadVideoXml', [member, err]);
			});
		}

		//表情
		if( msg.msgtype == 47 ){

			var fn = this.wx.SendEmojiXml(member.weixin_id, member.group_id, detail);

			fn.then(ret => {
				log.info('表情成功', [member, ret]);
			}).catch(err => {
				log.error( 'SendEmojiXml', [member, err]);
			});
		}

		//小程序
		if( msg.msgtype == 49 ){

			var fn = this.wx.SendAppMsgXml(member.weixin_id, member.group_id, detail);

			fn.then(ret => {
				log.info('小程序成功', [member, ret.msgId]);
			}).catch(err => {
				log.error( 'SendAppMsgXml', [member, err]);
			});
		}

		return fn;

	}

}

module.exports = Course;