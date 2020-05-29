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
		var keybuf = '';
		var locked = false;

		///////////////

		//最近一次微信群消息ID
		this.sider.get( this.stamp, ( err, ret ) => {
			keybuf = ret || keybuf;
			log.info( 'init', keybuf );
		} );

		//处理 Redis 消息
		this.redis.on('message', function (channel, message) {

			//正在读取消息
			if( locked ){
				return;
			}else{
				locked = true;
			}

			let pm = self.wx.NewSync( conf.wechat, keybuf );

			//let pm = this.wx.InitContact( conf.wechat );

			pm.then(ret => {

				//获取最新消息
				var msgs = self.filterMessage(ret.cmdList.list, { fromUserName: conf.follow.groups_id, content: conf.follow.groups + ':\n'  });
				
				log.info( '消息数量', ret.cmdList.count + ' / ' + msgs.length );
				log.info( '监听对象', conf.follow.groups_id + ' / ' + conf.follow.groups );

				if( msgs.length ){

					log.info( '最新消息', msgs );
	
					//获取到新消息
					self.send(msgs);

				}
				
				//记录消息标记
				keybuf = ret.keyBuf.buffer;
				self.sider.set( self.stamp, keybuf );

				//解除读消息锁
				locked = false;

				req.status(conf.report, 'MM_Groups', msgs.length, { '原始消息' : ret.cmdList.count } );

			}).catch(err => {

				locked = false;

				log.info( err );

				req.status(conf.report, 'MM_Groups', 500, err);

			});

			//最后一次消息时间
			self.lastmsg = com.getTime();

		});

		//订阅 Redis 频道消息
		this.redis.subscribe( this.channel );

		///////////////

		//每3分钟心跳一次
		setInterval( this.heartBeat.bind(this), 60 * 1000 * 3 );

		//每1分钟同步一次
		setInterval( this.timedPull.bind(this), 60 * 1000 );

	}

	/**
     * 循环发送微信群
	 * @param object 消息数据
     */
	send(msgs) {

		var self = this;

		//this.redis.smembers('weixin_list', function (err, res) {
		this.mysql.query('SELECT member_id, weixin_id, groups_list FROM `pre_member_weixin` WHERE groups > 0 AND groups_num > 0 ORDER BY auto_id ASC', function (err, res) {

			if( err ){
				log.error( err );
				return;
			}else{
				log.info( '本次发群', '', res.length + ' 人' );
			}

			for (let i = 0; i < res.length; i++) {

				let row = res[i];

				//转发群消息
				self.forwardMessage(msgs, row);

				//更新发群时间
				self.mysql.query('UPDATE `pre_member_weixin` SET groups_time = UNIX_TIMESTAMP() WHERE member_id = ?', [ row.member_id ] );

			}

		});

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

		this.mysql.query('SELECT member_id, weixin_id, groups_list FROM `pre_member_weixin` ORDER BY auto_id ASC', function (err, res) {

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

					log.info( '心跳成功', row.weixin_id, ret );

				}).catch( err => {

					log.info( 'Heartbeat', err );

					if( err.indexOf('退出微信登录') > -1 ){
						klas.init( row.weixin_id );
					}

				} );

			}

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

		//长时间没有读取消息
		if( work && diff > 15 ){
			this.sider.publish( this.channel, time );
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
				//谁说的活
				if( w == 'content' && msg[w].string.indexOf( where[w] ) === 0 ){					
					idx++;
				}else if ( msg[w].string == where[w] ) {
					idx++;
				}
			};

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

		for (let i = 0; i < msgs.length; i++) {

			var msg = msgs[i];
			var detail = msg.content.string;

			var groups = JSON.parse( member.groups_list );
			var roomid = groups.map( ele => { return ele.userName } );

			if( roomid.length == 0 ){
				break;
			}

			log.info( '当前微信', { '微信号' : member.weixin_id, '群数量' : roomid.length } );

			//是否要推迟，针对 表情 或 分割线
			if( lazy && ( msg.msgType == 47 || detail.indexOf( self.conf.retard ) >= 0 ) ){
				stag.push( msg );
				log.warn('推迟消息', msg);
				continue;
			}

			//文字
			if (msg.msgType == 1) {

				//延迟消息，不是最后一条消息时
				//log.info( detail );
				//log.info( '__LAZY__', lazy, detail.indexOf( self.conf.retard ) >= 0 );

				//转链
				req.get(self.conf.convert, { 'member_id' : member.member_id, 'text' : detail }, (code, body) => {

					//解除延迟
					lazy = false;

					var data = JSON.parse( body );
					
					//转链成功，发送消息，否则跳过
					if( data.status >= 0 ){

						let pm = self.wx.NewSendMsg(member.weixin_id, roomid, data.result, msg.msgSource);

						pm.then(ret => {
							log.info('发群成功', ret.count);
						}).catch(msg => {
							log.info('NewSendMsg', msg);
						});

					}else{

						log.error('转链错误', data);

						self.mysql.query('UPDATE `pre_member_weixin` SET status = ?, updated_time = ? WHERE member_id = ?', [ body, com.getTime(), member.member_id ] );

					}

					//////////////

					if( stag.length ){
					
						log.warn('迟延消息', stag.length);
	
						//处理迟延消息
						while( stag.length > 0 ){
							self.sendMsg( stag.pop(), member.weixin_id, roomid );
						}

					}

				}, ( data ) =>{

					var conv = act.detectTbc( data.text ) || act.detectUrl( data.text );						

					log.info('原始文本', data.text );
					log.debug('是否转链', conv);

					//是口令，需要转链
					if( conv ){
						lazy = true;
						return { 'request' : true };
					}else{
						return { 'request' : false, 'respond' : JSON.stringify( { 'status' : 0, 'result' : data.text } ) };
					}

				} );

			}

			//其他消息
			if ( msg.msgType != 1 ) {
				this.sendMsg( msg, member.weixin_id, roomid );
			}

		}

	}

	/**
	 * 转发群消息
	 * @param object 单条消息
	 * @param string 微信 ID
	 * @param object 微信群
	 */
	sendMsg( msg, weixin_id, roomid ){

		var self = this;
		var detail = msg.content.string;
		var struct = detail.indexOf('<') == 0;

		if (msg.msgType == 1) {

			let fn = self.wx.NewSendMsg(weixin_id, roomid, detail, msg.msgSource);

			fn.then(ret => {
				log.info('发群成功', ret.count);
			}).catch(msg => {
				log.info('发群失败', msg);
			});

		}

		//图片
		if (msg.msgType == 3 && struct) {

			for( let i = 0; i < roomid.length; i++ ){
				var fn = self.wx.UploadMsgImgXml(weixin_id, roomid[i], detail);
			}

			fn.then(ret => {
				log.info('发图成功', ret);
			}).catch(err => {
				log.error('发图失败', err);
			});

		}

		//视频
		if (msg.msgType == 43 && struct) {

			for( let i = 0; i < roomid.length; i++ ){
				var fn = self.wx.UploadVideoXml(weixin_id, roomid[i], detail);
			}

			fn.then(ret => {
				log.info('视频成功', ret);
			}).catch(err => {
				log.error('视频失败', err);
			});

		}

		//表情
		if (msg.msgType == 47 && struct) {

			for( let i = 0; i < roomid.length; i++ ){
				var fn = self.wx.SendEmojiXml(weixin_id, roomid[i], detail);
			}

			fn.then(ret => {
				log.info('表情成功', ret);
			}).catch(err => {
				log.error('表情失败', err);
			});

		}

	}

}

module.exports = Groups;