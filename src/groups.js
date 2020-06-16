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
		this.members = [];
		this.queues = [];
		this.locked = 0;
	}

	init(){

		var self = this;
		var conf = this.conf;
		var wait = 60;
		var keybuf = '';

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
			if( self.locked && self.locked >= com.getTime() - wait ){
				log.info( '读消息锁', locked );
				return;
			}else{
				self.locked = com.getTime();
				log.info( '拉取方式', message );
			}

			let pm = self.wx.NewSync( conf.wechat, keybuf );

			pm.then(ret => {

				log.info( '原始消息', ret.cmdList.list );

				//获取最新消息
				var data = self.filterMessage( ret.cmdList.list, where );

				//发送最新消息
				if( data.message.length ){
					self.send( data );
				}
				
				log.info( '消息数量', { '原消息' : ret.cmdList.count, '筛选后' : data.message.length } );
				log.info( '有效消息', data );
				
				//记录消息标记
				keybuf = ret.keyBuf.buffer;

				//临时存储一小时
				self.sider.set( self.stamp, keybuf );
				self.sider.expire( self.stamp, 3600 * 2 );

				req.status(conf.report, 'MM_Groups', data.message.length, { '原始消息' : ret.cmdList.count } );

			}).catch(err => {

				log.info( '读取错误', err );

				req.status(conf.report, 'MM_Groups', 500, err);

			}).finally( () => {

				//解除读消息锁
				self.locked = 0;

			} );

		});

		//订阅 Redis 频道消息
		this.redis.subscribe( this.channel );

		///////////////

		//每分钟分批心跳
		this.heartBeat();

		//每分钟分批心跳
		this.getMember();

	}

	/**
     * 循环发送微信群
	 * @param object 消息数据
     */
	send(msgs) {

		var self = this;
		var size = self.members.length;
		var func = ( i ) => {

			self.parseMessage( self.members[i], msgs );

			if( i < size - 1 ){
				setTimeout( () => { func( i + 1 ); }, 50 );
			}

			if( i > 0 ){
				self.forwardMessage();
			}

			//本地测试，单用户
			if( size == 1 ){
				setTimeout( self.forwardMessage.bind( self ), 15 * 1000 );
			}

		}

		//开始执行
		func( 0 );

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
	
						log.info( '心跳成功', [row.weixin_id, row.member_id] );
	
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
				return log.error( '心跳统计', err );
			}

			//以十分钟一轮，每次心跳数量
			span = parseInt( res[0].count / 10 );

			log.info( '心跳计划', '总人数 ' + res[0].count + '，每次心跳 ' + span );
			
			setInterval( func, 60 * 900 );
			
		});

	}

	/**
	 * 拉取有效用户
	 */
	getMember() {

		var self = this;

		//昨天时间
		var last = com.strtotime('-1 day');
		var date = new Date(last * 1000).format('yyyyMMdd');

		var func = () => {
			
			var time = com.getTime() - 60 * 20;

			self.mysql.query('SELECT auto_id, member_id, weixin_id, groups_list FROM `pre_member_weixin` WHERE groups > 0 AND groups_num > 0 AND created_date <= ? AND heartbeat_time >= ? ORDER BY auto_id ASC', [date, time], function (err, res) {

				if( err ){
					log.error( err );
					return;
				}else{
					log.info( '有效用户', res.length + ' 人' );
				}

				for (let i = 0; i < res.length; i++) {

					var groups = JSON.parse( res[i].groups_list );
					var roomid = groups.map( ele => { return ele.userName } );

						res[i].roomid = roomid;

					delete res[i].groups_list;

				}

				self.members = res;

			});

		}

		func();

		//每十分钟同步一次
		setInterval( func, 60 * 1000 * 10 );

	}

	/**
	 * 消息过滤器
	 * @param object 消息数据
	 * @param object 过滤条件
	 * @param integer 返回数据，-1 全返回，1 仅返回单条
	 */
	filterMessage( msgs, where = {}, limit = -1 ) {

		//构造数据包
		var data = {

			//需要转链
			convert: 0,

			//消息列表，{ exch, msgid, msgtype, content, source }
			message: [],
		};

		for (let i = 0; i < msgs.length; i++) {

			var size = 0;
			var item = msgs[i].cmdBuf;
			let text = item.content.string;

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

			//满足所有条件
			if (size == Object.keys(where).length) {

				let exch = item.msgType == 1 ? ( act.detectTbc( text ) || act.detectUrl( text ) ) : false;

				if( exch ){ data.convert ++; }

				data.message.push( { msgid : item.msgId, msgtype : item.msgType, content : text, source : item.msgSource, exch });

			}

		};

		//只取一条时，直接返回消息体
		if (limit == 1) {
			return data.message.length ? data.message[0] : null;
		} else {
			return data;
		}

	}

	/**
	 * 预处理消息
	 * @param object 用户数据
	 * @param object 发圈数据
	 * @param integer 延迟时间
	 */
	parseMessage( member, data, lazy_time = 0 ){

		var data = com.clone( data );
		var self = this;

		//无需转链，直接回调
		if( data.convert == 0 ){
			return self.queues.push( { member, data } );
		}

		for (let i = 0; i < data.message.length; i++) {

			let comm = data.message[i];
			let exch = comm.msgtype == 1 && comm.exch;

			req.get(self.conf.convert, { 'member_id' : member.member_id, 'text' : comm.content, 'lazy_time' : lazy_time }, (code, body) => {
				
				try {
					if( typeof body == 'string' ){
						body = JSON.parse( body );
					}
				} catch( e ){
					body = { 'status' : -code, 'body' : body, 'error' : e.toString() };
				}

				if( exch ){
					log.info('转链结果', { 'member_id' : member.member_id, body, lazy_time, 'convert' : data.convert });
				}

				///////////////
				
				if( body.status >= 0 ){

					//评论
					comm.content = body.result;

					//转链成功，执行回调
					comm.exch && data.convert --;

					if( data.convert == 0 ){
						self.queues.push( { member, data } );
					}

				}else{

					body.source = 'groups';
					body.lazy_time = lazy_time;

					self.mysql.query('UPDATE `pre_member_weixin` SET status = ?, status_time = ? WHERE member_id = ?', [ JSON.stringify( body ), com.getTime(), member.member_id ] );

					//写入延迟消息
					if( lazy_time == 0 ){
						setTimeout( () => { self.parseMessage( member, data, com.getTime() ); }, 60 * 1000 * 5 );
					}

				}

			}, ( data ) =>{

				//是口令，需要转链
				if( exch ){
					return { 'request' : true };
				}else{
					return { 'request' : false, 'respond' : { 'status' : 0, 'result' : data.text } };
				}

			} );

		}

	}

	/**
	 * 转发群消息
	 * @param object 消息数据
	 * @param object 用户信息
	 * @param integer 延迟时间
	 */
	forwardMessage() {

		if( this.queues.length == 0 ){
			return log.info('暂无消息');
		}

		var self = this;
		let item = this.queues.shift();
		let user = item.member;
		let data = item.data;

		log.info( '当前微信', { '用户ID' : user.member_id, '微信号' : user.weixin_id, '群数量' : user.roomid.length, '消息量' : data.message.length } );

		var func = ( ) => {

			log.info('消息拆包', { '用户ID' : user.member_id, '待发送' : data.message.length } );

			let msg = data.message.shift();
			let res = self.sendMsg( user, msg );

			res.then(ret => {

				//消息包未完成
				if( data.message.length > 0 ){

					setTimeout( () => { func(); }, 3000 );

				}else{

					log.info('群发完毕', user.member_id);
					
					//更新发群时间
					self.mysql.query('UPDATE `pre_member_weixin` SET groups_time = UNIX_TIMESTAMP() WHERE member_id = ?', [ user.member_id ] );

					//消息队列未完成
					self.forwardMessage();

				}

			}).catch(err => {
				//log.error('发群失败', [member.member_id, err]);
			});

		};

		func();

	}

	/**
	 * 转发群消息
	 * @param object 用户数据
	 * @param object 单条消息
	 */
	sendMsg( member, msg ){

		var detail = msg.content;

		//文本
		if ( msg.msgtype == 1 ) {

			let fn = this.wx.NewSendMsg(member.weixin_id, member.roomid, detail, msg.source);

			fn.then(ret => {
				log.info('文本成功', [member.member_id, ret.count]);
			}).catch(err => {
				log.error('文本失败', [member.member_id, err]);
			});

			return fn;

		}

		//图片
		if ( msg.msgtype == 3 ) {

			for( let i = 0; i < member.roomid.length; i++ ){
				var fn = this.wx.UploadMsgImgXml(member.weixin_id, member.roomid[i], detail);
			}

			fn.then(ret => {
				log.info('发图成功', [member.member_id, ret.msgId]);
			}).catch(err => {
				log.error('发图失败', [member.member_id, err]);
			});

			return fn;

		}

		//视频
		if ( msg.msgtype == 43 ) {

			for( let i = 0; i < member.roomid.length; i++ ){
				var fn = this.wx.UploadVideoXml(member.weixin_id, member.roomid[i], detail);
			}

			fn.then(ret => {
				log.info('视频成功', [member.member_id, ret.msgId]);
			}).catch(err => {
				log.error('视频失败', [member.member_id, err]);
			});

			return fn;

		}


		//表情
		if ( msg.msgtype == 47 ) {

			for( let i = 0; i < member.roomid.length; i++ ){
				var fn = this.wx.SendEmojiXml(member.weixin_id, member.roomid[i], detail);
			}

			fn.then(ret => {
				log.info('表情成功', [member.member_id, ret]);
			}).catch(err => {
				log.error('表情失败', [member.member_id, err]);
			});

			return fn;

		}

		//小程序
		if ( msg.msgtype == 49 ) {

			detail = detail.replace(/userid=(\d*)/g, 'userid=' + member.member_id);

			log.info('替换UID', detail);

			for( let i = 0; i < member.roomid.length; i++ ){
				var fn = this.wx.SendAppMsgXml(member.weixin_id, member.roomid[i], detail);
			}

			fn.then(ret => {
				log.info('小程序成功', [member.member_id, ret.msgId]);
			}).catch(err => {
				log.error('小程序失败', [member.member_id, err]);
			});

			return fn;

		}

	}

}

module.exports = Groups;