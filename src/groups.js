'use strict'

/**
 * 微信群控制器
 */

const wx = require('../lib/weixin');
const com = require('../lib/common');
const req = require('../lib/request');

class Groups {

    /**
     * 构造函数
     */
	constructor(conf) {

		var self = this;

		this.conf = conf;
		this.wx = new wx(conf.weixin);
		//this.redis = com.redis(conf.redis);
		this.mysql = com.mysql(conf.mysql);
		var keybuf = '';

		//每分钟获取一次群消息
		setInterval(() => {

			let pm = self.wx.NewSync( conf.wechat, keybuf );

			//let pm = this.wx.InitContact( conf.wechat );

			pm.then(ret => {

				//console.log( 'ret', ret );
				//console.log( '--------' );
				//console.log( 'ret', ret.cmdList.list );

				console.log( '--------------------------' );

				//获取最新消息
				var msgs = self.filterMessage(ret.cmdList.list, { fromUserName: conf.follow.groups_id, content: conf.follow.groups + ':\n'  });
				
				console.log( '原始消息', ret.cmdList.count, '过滤消息', msgs.length );

				//var msgs = self.filterMessage(ret.cmdList.list, { });

				console.log( '监听群组', conf.follow.groups_id, '消息作者', conf.follow.groups );

				console.log( '最新消息', msgs );

				msgs.length && self.send(msgs);
				
				keybuf = ret.keyBuf.buffer;

				//console.log( 'keybuf', keybuf );

			}).catch(err => {
				console.log( err );
			});

		}, 30 * 1000 );

		///////////////

		//每3分钟心跳一次
		setInterval( this.Heartbeat.bind(this), 60 * 1000 * 3 );

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
				console.log( err );
				return;
			}else{
				console.log( '本次发群', res.length + ' 人' );
			}

			for (let i = 0; i < res.length; i++) {

				let row = res[i];

				//for (let i = 0; i < res.length; i++) {

					//let user = JSON.parse(res);

					//转发群消息
					self.forwardMessage(msgs, row);

					//更新发群时间
					self.mysql.query('UPDATE `pre_member_weixin` SET groups_time = UNIX_TIMESTAMP() WHERE member_id = ?', [ row.member_id ] );

				//}

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
	Heartbeat() {

		var self = this;

		//this.mysql = com.mysql(this.conf.mysql);

		this.mysql.query('SELECT member_id, weixin_id, groups_list FROM `pre_member_weixin` ORDER BY auto_id ASC', function (err, res) {

			for (let i = 0; i < res.length; i++) {

				let row = res[i];

				//获取群消息
				let pm = self.wx.Heartbeat( row.weixin_id );

				pm.then(ret => {

					//更新群发设置
					//self.mysql.query('UPDATE `pre_member_weixin` SET groups_list = ?, groups_num, heartbeat_time = UNIX_TIMESTAMP() WHERE member_id = ?', [ JSON.stringify( gps ), num, row.member_id ] );
					
					//wx.SendTxtMessage(member.weixin_id, gid, gid + ' 设置成功');

					console.log( '心跳成功', row.weixin_id );

				}).catch( err => {

				} );

			}

		});

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

			//console.log(chat_room, group_id);

		}).catch(msg => {
			console.log(msg);
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

		for (let i = 0; i < msgs.length; i++) {

			var msg = msgs[i];
			var detail = msg.content.string;
			var struct = detail.indexOf('<') == 0;

			var groups = JSON.parse( member.groups_list );
			var groups = com.filter( groups, val => {
				return val == 'ON';
			} );
			var roomid = Object.keys( groups );

			if( roomid.length == 0 ){
				break;
			}

			console.log(msg, '------------------------');

			//文字
			if (msg.msgType == 1) {				

				//转链
				req.get(self.conf.convert, { 'member_id' : member.member_id, 'text' : detail }, (code, body) => {

					//console.log( 'body', body );

					var data = JSON.parse( body );
					
					if( data.status >= 0 ){
						var body = data.result;
					}else{
						console.log('转链错误', data.result);
						return;
					}

					let pm = self.wx.NewSendMsg(member.weixin_id, roomid, body, msg.msgSource);

					pm.then(ret => {
						console.log('发群成功', ret.count);
					}).catch(msg => {
						console.log('NewSendMsg', msg);
					});

				}, ( data ) =>{

					//是口令，需要转链
					if( self.conf.tbtoken.test( data.text ) ){
						return { 'request' : true };
					}else{
						return { 'request' : false, 'respond' : JSON.stringify( { 'status' : 0, 'result' : data.text } ) };
					}

				} );

			}

			//图片
			if (msg.msgType == 3 && struct) {

				for( let i = 0; i < roomid.length; i++ ){
					var fn = self.wx.UploadMsgImgXml(member.weixin_id, roomid[i], detail);
				}

				fn.then(ret => {
					console.log('ret', ret);
				}).catch(err => {
					console.log('msg', err);
				});

			}

			//视频
			if (msg.msgType == 43 && struct) {

				for( let i = 0; i < roomid.length; i++ ){
					var fn = self.wx.UploadVideoXml(member.weixin_id, roomid[i], detail);
				}

				fn.then(ret => {
					console.log('ret', ret);
				}).catch(err => {
					console.log('msg', err);
				});

			}

			//表情
			if (msg.msgType == 47 && struct) {

				//var len = detail.match(/len="(.+?)"/)[1];
				//var md5 = detail.match(/md5="(.+?)"/)[1];

				for( let i = 0; i < roomid.length; i++ ){
					var fn = self.wx.SendEmojiXml(member.weixin_id, roomid[i], detail);
				}

				fn.then(ret => {
					console.log('ret', ret);
				}).catch(err => {
					console.log('msg', err);
				});

			}

		}

	}

}

module.exports = Groups;