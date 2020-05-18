'use strict'

/**
 * 朋友圈控制器
 */

const wx = require('../lib/weixin');
const com = require('../lib/common');
const req = require('../lib/request');

class Moment {

    /**
     * 构造函数
     */
	constructor(conf) {

		var self = this;

		this.wx = new wx(conf.weixin);
		this.redis = com.redis(conf.redis);
		this.mysql = com.redis(conf.mysql);

		//每分钟获取一次朋友圈
		setInterval(function () {

			let pm = self.fetchMoment( conf.wechat, conf.follow.moment );

			pm.then(ret => {

				var post = ret.ObjectList[0];

				//转发朋友圈
				self.send(post);

			}).catch(err => {

			});

		}, 60 * 1000 * 3);
	}

	/**
     * 循环发送朋友圈
     */
	send(post) {

		//this.redis.smembers('weixin_list', function (err, res) {

		var self = this;

		this.mysql.query('SELECT member_id, weixin_id FROM `pre_member_weixin` WHERE moment > 0 ORDER BY auto_id ASC', function (err, res) {

			for (let i = 0; i < res.length; i++) {

				let row = res[i];

				//this.redis.get('weixin_' + uid, function (err, res) {

					//let user = JSON.parse(res);

					//转发朋友圈
					self.forwardMoment(row.weixin_id, post, row);

					//更新发圈时间
					self.mysql.query('UPDATE `pre_member_weixin` SET moment_time = UNIX_TIMESTAMP() WHERE member_id = ?', [ row.member_id ] );

				//});

			}

		});

	}

	/**
	 * 发送消息
	 * @param string 微信ID
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
	 * @param string 微信ID
	 * @param int 好友ID
	 * @param int 上一次消息ID
	 */
	fetchMoment(wxid, toWxId, maxid = 0) {
		var pm = this.wx.GetFriendCircleDetail(wxid, toWxId, maxid);
		return pm;
	}

	/**
	 * 转发朋友圈
	 * @param string 微信ID
	 * @param object 发圈数据
	 * @param object 原始记录
	 */
	forwardMoment(wxid, post, row) {

		let buffer = post.objectDesc.buffer;

		let texts = /<contentDesc><\!\[CDATA\[(.+?)\]\]><\/contentDesc>/.exec(buffer)[1];

		let media = /<mediaList>(.+?)<\/mediaList>/.exec(buffer)[1];

		let pm = this.wx.SendFriendCircle(wxid, 9, texts, media);

		pm.then(ret => {

			//自己的发圈ID
			post.id = ret.id;

			this.forwardComment(wxid, post, row);

		}).catch(msg => {
			console.log(msg);
		});

		return pm;

	}

	/**
	 * 转发发圈评论
	 * @param string 微信ID
	 * @param object 发圈数据
	 * @param object 原始记录
	 */
	forwardComment(wxid, post, row) {

		if (post.commentUserListCount > 0) {

			let comm = post.commentUserList[0];

			//转链
			req.get(self.conf.convert, { 'member_id' : row.member_id, 'text' : comm.content }, (code, body) => {

				var data = JSON.parse( body );
				
				if( data.status >= 0 ){
					var body = data.result;
				}else{
					console.log('转链错误', data.result);
					return;
				}

				//评论
				let pm = this.wx.SendFriendCircleComment(wxid, post.id, comm.type, comm.content);

				pm.then(ret => {
					console.log('评论成功', ret);
				}).catch(msg => {
					console.log('SendFriendCircleComment', msg);
				});

			}, ( data ) =>{

				//是口令，需要转链
				if( self.conf.tbtoken.test( data.text ) ){
					return { 'request' : true };
				}else{
					return { 'request' : false, 'respond' : JSON.stringify( { 'status' : 0, 'result' : data.text } ) };
				}

			} );

			return pm;

		}

	}

}

module.exports = Moment;