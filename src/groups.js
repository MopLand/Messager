'use strict'

/**
 * 微信群控制器
 */

const wx = require('../lib/weixin');
const com = require('../lib/common');
const req = require('../lib/request');
const act = require('../lib/activity');
const Logger = require('../lib/logger');
const Account = require('./account');
const tag = com.fileName( __filename, false );
const log = new Logger( tag );

class Groups {

    /**
     * 构造函数
     */
	constructor(conf) {
		this.conf = conf;
		this.wx = new wx(conf.weixin);
		this.redis = com.redis(conf.redis);
		this.sider = com.redis(conf.redis);
		this.mysql = com.mysql(conf.mysql, (db => { this.mysql = db; }).bind(this));
		this.stamp = 'mm_groups_id';
		this.channel = 'mm_groups';
		this.lastmsg = com.getTime();
	}

	init(){

		var self = this;
		var conf = this.conf;
		var wait = 60;
		var keybuf = '';
		var locked = 0;

		///////////////

		//消息筛选条件
		var where = {}

		if( conf.groups.follow ){
			where.fromUserName = conf.groups.follow;
		}

		if( conf.groups.talker ){
			where.speaker = conf.groups.talker + ':\n';
		}

		if( conf.groups.detect ){
			where.allowed = conf.groups.detect;
		}
		
		log.info( '监听条件', where );

		///////////////

		//最近一次微信群消息ID
		this.sider.get( this.stamp, ( err, ret ) => {
			keybuf = ret || keybuf;
			log.info( 'init', keybuf );
		} );

		//处理 Redis 消息
		this.redis.on('message', function (channel, message) {

			//正在读取消息，锁还未失效
			if( locked && locked >= com.getTime() - wait ){
				log.info( '读消息锁', locked );
				return;
			}else{
				locked = com.getTime();
			}

			let pm = self.wx.NewSync( conf.wechat, keybuf );

			//let pm = this.wx.InitContact( conf.wechat );

			log.info( '拉取方式', message );

			pm.then(ret => {

				log.info( '原始消息', ret.cmdList.list );

				//获取最新消息
				var msgs = self.filterMessage( ret.cmdList.list, where );
				
				log.info( '消息数量', ret.cmdList.count + ' / ' + msgs.length );

				if( msgs.length ){

					log.info( '最新消息', msgs );
	
					//获取到新消息
					self.send(msgs);

				}
				
				//记录消息标记
				keybuf = ret.keyBuf.buffer;

				//临时存储一小时
				self.sider.set( self.stamp, keybuf );
				self.sider.expire( self.stamp, 3600 * 2 );

				req.status(conf.report, 'MM_Groups', msgs.length, { '原始消息' : ret.cmdList.count } );

			}).catch(err => {

				log.info( '读取错误', err );

				req.status(conf.report, 'MM_Groups', 500, err);

			}).finally( () => {

				//解除读消息锁
				locked = 0;

			} );

			//最后一次消息时间
			self.lastmsg = com.getTime();

		});

		//订阅 Redis 频道消息
		this.redis.subscribe( this.channel );

		///////////////

		//每分钟分批心跳
		this.heartBeat();

		//每分钟同步一次
		setInterval( this.timedPull.bind(this), 60 * 1111 );

	}

	/**
     * 循环发送微信群
	 * @param object 消息数据
     */
	send(msgs) {

		var self = this;
		var time = com.getTime() - 60 * 15;

		var func = ( auto ) => {

			self.mysql.query('SELECT auto_id, member_id, weixin_id, groups_list FROM `pre_member_weixin` WHERE groups > 0 AND groups_num > 0 AND heartbeat_time >= ? AND auto_id > ? ORDER BY auto_id ASC LIMIT 50', [time, auto], function (err, res) {

				if( err ){
					log.error( err );
					return;
				}

				if( res.length == 0 ){
					log.info( '处理完毕', time );
					return;
				}else{
					log.info( '本次发群', res.length + ' 人' );
				}

				for (var i = 0; i < res.length; i++) {

					//转发群消息
					self.forwardMessage(msgs, res[i]);

					//更新发群时间
					self.mysql.query('UPDATE `pre_member_weixin` SET groups_time = UNIX_TIMESTAMP() WHERE member_id = ?', [ res[i].member_id ] );

				}

				//再次执行，传入最后ID
				func( res[i - 1].auto_id );

			});

		}

		//开始执行
		func( 0 );

	}

	/**
	 * 监听群命令
	 */
	findCommand() {

		var self = this;

		this.mysql.query('SELECT member_id, weixin_id, groups_list FROM `pre_member_weixin` ORDER BY auto_id ASC', function (err, res) {

			for (let i = 0; i < res.length; i++) {

				let row = res[i];

				//获取群消息
				let pm = this.wx.SyncMessage( row.weixin_id );

				pm.then(ret => {

					//获取最新命令
					var msg = self.filterMessage(ret.AddMsgs, { MsgType: 1, FromUserName: row.weixin_id }, 1 );
					var cmd = msg.Content.String;
					var gid = msg.ToUserName;
					var gps = row.groups_list ? JSON.parse( row.groups_list ) : {};
					var num = Object.keys( gps ).length;

					//限制群数量
					if( !gps[gid] && num >= 5 ){
						wx.SendTxtMessage(member.weixin_id, gid, '最多群发不超过 5 个群');
						return;
					}

					//新增本群
					if( !gps[gid] ){
						num ++;
					}

					if( cmd == '开启群发' ){
						gps[gid] = 'ON';
					}

					if( cmd == '关闭群发' ){
						gps[gid] = 'OFF';
					}

					//更新群发设置
					self.mysql.query('UPDATE `pre_member_weixin` SET groups_list = ?, groups_num, updated_time = UNIX_TIMESTAMP() WHERE member_id = ?', [ JSON.stringify( gps ), num, row.member_id ] );
					
					wx.SendTxtMessage(member.weixin_id, gid, gid + ' 设置成功');

				}).catch( err => {

				} );

			}

		});

	}

	/**
	 * 同步心跳
	 */
	heartBeat() {

		var self = this;
		var klas = new Account(this.conf);
		var span = 60;
		
		//半小时以内有心跳
		var time = () => {
			return com.getTime() - 60 * 30;
		};

		var func = () => {

			self.mysql.query('SELECT member_id, weixin_id FROM `pre_member_weixin` WHERE heartbeat_time >= ? ORDER BY heartbeat_time ASC LIMIT ?', [time(), span], function (err, res) {

				if( err ){
					log.error( err );
					return;
				}else{
					log.info( '本次心跳', res.length + ' 人' );
				}
	
				for (let i = 0; i < res.length; i++) {
	
					let row = res[i];
	
					//获取群消息
					let pm = self.wx.Heartbeat( row.weixin_id );
	
					pm.then(ret => {
	
						//更新群发设置
						self.mysql.query('UPDATE `pre_member_weixin` SET heartbeat_time = UNIX_TIMESTAMP() WHERE member_id = ?', [ row.member_id ] );
	
						log.info( '心跳成功', [row.weixin_id, ret] );
	
					}).catch( err => {
	
						log.info( '心跳失败', [row.weixin_id, err] );
	
						if( err.indexOf('退出微信登录') > -1 ){
							klas.init( row.weixin_id );
						}
	
					} );
	
				}
	
			});

		}

		///////////////

		log.info( '心跳范围', time() );

		self.mysql.query('SELECT COUNT(*) AS count FROM `pre_member_weixin` WHERE heartbeat_time >= ?', [time()], function (err, res) {

			if( err ){
				log.error( '心跳统计', err );
				return;
			}

			span = parseInt( res[0].count / 15 );

			log.info( '心跳计划', '总人数 ' + res[0].count + '，每次心跳 ' + span );
			
			setInterval( func, 60 * 1100 );
			
		});

	}

	/**
	 * 主动同步
	 */
	timedPull() {

		//工作时段
		var date = new Date();
		var work = date.format('h') >= this.conf.worked;
		var time = com.getTime();

		//上次消息过去了多少分钟
		var diff = ( time - this.lastmsg ) / 60;
		log.info( '过去时间', diff + '分钟' );

		//长时间没有读取消息
		if( work && diff > 15 ){
			this.sider.publish( this.channel, 'timer' );
			log.info( '主动拉取', time );
		}

	}

	/**
	 * 消息过滤器
	 * @param object 消息数据
	 * @param object 过滤条件
	 * @param integer 返回数据，-1 全返回，1 仅返回单条
	 */
	filterMessage(AddMsgs, where = {}, size = -1) {

		var msgs = [];

		for (let i = 0; i < AddMsgs.length; i++) {

			var idx = 0;
			var msg = AddMsgs[i].cmdBuf;
			
			for (let w in where) {

				switch( w ){

					//谁说的活
					case 'speaker':
						idx += msg['content'].string.indexOf( where[w] ) === 0 ? 1 : 0;
					break;

					//允许的文本
					case 'allowed':
						idx += ( msg.msgType != 1 || where[w].test( msg['content'].string ) ) ? 1 : 0;
					break;

					//其他字段
					default:
						idx += msg[w].string == where[w] ? 1 : 0;
					break;

				}

			};

			//console.log( msg );
			//console.log( idx );

			//群消息，过滤 xxx:\n
			if( /@chatroom$/.test( msg.fromUserName.string ) ){
				msg.content.string = msg.content.string.replace(/^[0-9a-zA-Z_\-]{1,}:\n/,'');
			}

			//满足所有条件
			if (idx == Object.keys(where).length) {
				msgs.push(msg);
			}
		};

		if (size == 1) {
			return msgs.length ? msgs[0] : null;
		} else {
			return msgs;
		}

	}

	/**
	 * 获取微信群
	 * @param string 微信ID
	 * @param string 内容
	 */
	findMessage(wxid, text) {

		var pm = wx.SyncMessage(wxid);

		pm.then(ret => {

			var group_id = '';

			var chat_room = this.filter(ret.AddMsgs, { Content: text, FromUserName: wxid }, 1);

			if (chat_room) {
				group_id = chat_room.ToUserName.String;
			}

			//log.info(chat_room, group_id);

		}).catch(msg => {
			log.error(msg);
		});

		return pm;

	}

	/**
	 * 转发群消息
	 * @param object 消息数据
	 * @param object 用户信息
	 */
	forwardMessage(msgs, member) {

		var self = this;
		var stag = [];
		var lazy = false;

		var groups = JSON.parse( member.groups_list );
		var roomid = groups.map( ele => { return ele.userName } );

		if( roomid.length == 0 ){
			log.error('无微信群', roomid);
			return;
		}

		log.info( '当前微信', { '微信号' : member.weixin_id, '群数量' : roomid.length } );

		///////////////

		for (let i = 0; i < msgs.length; i++) {

			var msg = msgs[i];
			var detail = msg.content.string;

			//是否要推迟，针对 表情 或 分割线
			if( lazy && ( msg.msgType == 47 || detail.indexOf( self.conf.groups.retard ) >= 0 ) ){
				stag.push( msg );
				log.warn('推迟消息', msg);
				continue;
			}

			//文字
			if (msg.msgType == 1) {

				//延迟消息，不是最后一条消息时
				//log.info( detail );
				//log.info( '__LAZY__', lazy, detail.indexOf( self.conf.groups.retard ) >= 0 );

				//转链
				req.get(self.conf.convert, { 'member_id' : member.member_id, 'text' : detail }, (code, body) => {

					//解除延迟
					lazy = false;
					
					if( typeof body == 'string' ){
						body = JSON.parse( body );
					}
					
					//转链成功，发送消息，否则跳过
					if( body.status >= 0 ){

						let pm = self.wx.NewSendMsg(member.weixin_id, roomid, body.result, msg.msgSource);

						pm.then(ret => {
							log.info('发群成功', [member.weixin_id, ret.count]);
						}).catch(err => {
							log.error('发群失败', [member.weixin_id, err]);
						});

						log.info('转链结果', [member.member_id, body]);

					}else{

						log.error('转链错误', [member.member_id, body]);

						self.mysql.query('UPDATE `pre_member_weixin` SET status = ?, status_time = ? WHERE member_id = ?', [ JSON.stringify( body ), com.getTime(), member.member_id ] );

					}

					//////////////

					if( stag.length ){
					
						log.warn('迟延消息', stag.length);
	
						//处理迟延消息
						while( stag.length > 0 ){
							self.sendMsg( stag.pop(), member, roomid );
						}

					}

				}, ( data ) =>{

					var conv = act.detectTbc( data.text ) || act.detectUrl( data.text );

					//log.info('原始文本', data.text );
					//log.debug('是否转链', conv);

					//是口令，需要转链
					if( conv ){
						lazy = true;
						return { 'request' : true };
					}else{
						return { 'request' : false, 'respond' : { 'status' : 0, 'result' : data.text } };
					}

				} );

			}

			//其他消息
			if ( msg.msgType != 1 ) {
				this.sendMsg( msg, member, roomid );
			}

		}

	}

	/**
	 * 转发群消息
	 * @param object 单条消息
	 * @param object 用户数据
	 * @param object 微信群
	 */
	sendMsg( msg, member, roomid ){

		var self = this;
		var detail = msg.content.string;
		var struct = detail.indexOf('<') == 0;

		if (msg.msgType == 1) {

			let fn = self.wx.NewSendMsg(member.weixin_id, roomid, detail, msg.msgSource);

			fn.then(ret => {
				log.info('发群成功', [member.member_id, ret.count]);
			}).catch(err => {
				log.error('发群失败', [member.member_id, err]);
			});

		}

		//图片
		if (msg.msgType == 3 && struct) {

			for( let i = 0; i < roomid.length; i++ ){
				var fn = self.wx.UploadMsgImgXml(member.weixin_id, roomid[i], detail);
			}

			fn.then(ret => {
				log.info('发图成功', [member.member_id, ret]);
			}).catch(err => {
				log.error('发图失败', [member.member_id, err]);
			});

		}

		//视频
		if (msg.msgType == 43 && struct) {

			for( let i = 0; i < roomid.length; i++ ){
				var fn = self.wx.UploadVideoXml(member.weixin_id, roomid[i], detail);
			}

			fn.then(ret => {
				log.info('视频成功', [member.member_id, ret]);
			}).catch(err => {
				log.error('视频失败', [member.member_id, err]);
			});

		}


		//表情
		if (msg.msgType == 47 && struct) {

			for( let i = 0; i < roomid.length; i++ ){
				var fn = self.wx.SendEmojiXml(member.weixin_id, roomid[i], detail);
			}

			fn.then(ret => {
				log.info('表情成功', [member.member_id, ret]);
			}).catch(err => {
				log.error('表情失败', [member.member_id, err]);
			});

		}

		//小程序
		if (msg.msgType == 49 && struct) {

			detail = detail.replace(/userid=(\d*)/g, 'userid=' + member.member_id);

			log.info('替换UID', detail);

			for( let i = 0; i < roomid.length; i++ ){
				var fn = self.wx.SendAppMsgXml(member.weixin_id, roomid[i], detail);
			}

			fn.then(ret => {
				log.info('小程序成功', [member.member_id, ret]);
			}).catch(err => {
				log.error('小程序失败', [member.member_id, err]);
			});

		}

	}

}

module.exports = Groups;