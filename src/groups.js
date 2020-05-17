'use strict'

/**
 * 微信群控制器
 */

const wx = require('../lib/weixin');
const com = require('../lib/common');

class Groups {

    /**
     * 构造函数
     */
	constructor(conf) {

		this.conf = conf;

		var self = this;

		this.wx = new wx(conf.weixin);
		this.redis = com.redis(conf.redis);

		//每分钟获取一次朋友圈
		setInterval(function () {

			let pm = this.wx.SyncMessage(wxid);

			pm.then(ret => {

				//获取最新消息
				var msgs = self.filterMessage(ret.AddMsgs, { ToUserName: group_id, FromUserName: wxid });

				self.send(msgs);

			}).catch(err => {

			});

		}, 60 * 1000);
	}

	/**
	 * 获取微信群
	 * @param int 微信ID
	 * @param int 类型
	 * @param string 内容
	 */
	find(wxid, text) {

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
	 * @param int 微信ID
	 * @param int 微信群ID
	 */
	forwardMessage(msgs, wxid, group_id) {

		for (let i = 0; i < msgs.length; i++) {

			var msg = msgs[i];

			console.log(msg, '------------------------');

			//文字
			if (msg.MsgType == 1) {
				wx.SendTxtMessage(wxid, [gpid], msg.Content.String);
			}

			//图片
			if (msg.MsgType == 3 && msg.Content.String.indexOf('<') == 0) {

				var fn = wx.SendForwardImg(wxid, [gpid], msg.Content.String);

				fn.then(ret => {
					console.log('ret', ret);
				}).catch(err => {
					console.log('msg', err);
				});

			}

			//视频
			if (msg.MsgType == 43 && msg.Content.String.indexOf('<') == 0) {

				var fn = wx.SendForwardVideo(wxid, [gpid], msg.Content.String);

				fn.then(ret => {
					console.log('ret', ret);
				}).catch(err => {
					console.log('msg', err);
				});

			}

			//表情
			if (msg.MsgType == 47 && msg.Content.String.indexOf('<') == 0) {

				var len = msg.Content.String.match(/len="(.+?)"/)[1];
				var md5 = msg.Content.String.match(/md5="(.+?)"/)[1];

				var fn = wx.SendForwardEmoji(wxid, [gpid], len, md5);

				fn.then(ret => {
					console.log('ret', ret);
				}).catch(err => {
					console.log('msg', err);
				});

			}

		}

	}

	/*
		消息过滤器
	*/
	filterMessage(AddMsgs, where = {}, size = -1) {

		var msgs = [];

		for (let i = 0; i < AddMsgs.length; i++) {

			var idx = 0;
			var msg = AddMsgs[i];

			for (let w in where) {
				if (msg[w].String == where[w]) {
					idx++;
				}
			};

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
     * 创建 Redis 连接
     */
	send(msgs) {

		this.redis.smembers("key", function (err, res) {

			for (let i = 0; i < res.length; i++) {

				var user = res[i];
				user = JSON.parse(user);

				//转发消息
				self.forwardMessage(msgs, user.wxid, user.group_id);

			}

		});

	}

}

module.exports = Groups;