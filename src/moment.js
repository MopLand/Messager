'use strict'

/**
 * 朋友圈控制器
 */

const wx = require('../lib/weixin');
const com = require('../lib/common');

class Moment {

    /**
     * 构造函数
     */
	constructor(conf) {

		var self = this;

		this.wx = new wx(conf.weixin);
		this.redis = com.redis(conf.redis);

		//每分钟获取一次朋友圈
		setInterval(function () {

			let pm = self.fetchMoment('veryide', 'wxid_ig5bgx8ydlbp22');

			pm.then(ret => {

				var post = ret.ObjectList[0];

				//转发朋友圈
				self.send(post);

			}).catch(err => {

			});

		}, 60 * 1000);
	}

	/**
     * 循环发送朋友圈
     */
	send(post) {

		this.redis.smembers('weixin_list', function (err, res) {

			for (let i = 0; i < res.length; i++) {

				let uid = res[i];

				this.redis.get('weixin_' + uid, function (err, res) {

					let user = JSON.parse(res);

					//转发朋友圈
					self.forwardMoment(user.wxid, post);

				});

			}

		});

	}

	/**
	 * 发送消息
	 * @param int 微信ID
	 * @param int 类型
	 * @param string 内容
	 */
	sendMoment(wxid, type, content) {

		var pm = this.wx.SendFriendCircle(wxid, type, content);

		pm.then(ret => {
			console.log(ret);
		}).catch(msg => {
			console.log(msg);
		});

		return pm;

	}

	/**
	 * 获取最新发圈
	 * @param int 微信ID
	 * @param int 好友ID
	 * @param int 上一次消息ID
	 */
	fetchMoment(wxid, toWxId, maxid = 0) {
		var pm = this.wx.GetFriendCircleDetail(wxid, toWxId, maxid);
		return pm;
	}

	/**
	 * 转发朋友圈
	 * @param int 微信ID
	 * @param object 发圈数据
	 */
	forwardMoment(wxid, post) {

		let buffer = post.objectDesc.buffer;

		let texts = /<contentDesc><\!\[CDATA\[(.+?)\]\]><\/contentDesc>/.exec(buffer)[1];

		let media = /<mediaList>(.+?)<\/mediaList>/.exec(buffer)[1];

		let pm = this.wx.SendFriendCircle(wxid, 9, texts, media);

		pm.then(ret => {

			//自己的发圈ID
			post.id = ret.id;

			this.forwardComment(post);

		}).catch(msg => {
			console.log(msg);
		});

		return pm;

	}

	/**
	 * 转发发圈评论
	 * @param int 微信ID
	 * @param object 发圈数据
	 * @param object 发圈数据
	 */
	forwardComment(wxid, post) {

		if (post.commentUserListCount > 0) {

			let comm = post.commentUserList[0];

			//评论
			let pm = this.wx.SendFriendCircleComment(wxid, post.id, comm.type, comm.content);

			pm.then(ret => {
				console.log('评论成功', ret);
			}).catch(msg => {
				console.log('SendFriendCircleComment', msg);
			});

			return pm;

		}

	}

}

module.exports = Moment;