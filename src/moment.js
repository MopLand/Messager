'use strict'

/**
 * 朋友圈控制器
 */

const wx = require('../lib/weixin');
const com = require('../lib/common');
const req = require('../lib/request');
const act = require('../lib/activity');

class Moment {

    /**
     * 构造函数
     */
	constructor(conf) {

		this.conf = conf;
		this.wx = new wx(conf.weixin);
		this.redis = com.redis(conf.redis);
		this.mysql = com.mysql(conf.mysql);
		this.stamp = 'mm_moment_id';
		
	}

	init(){

		var self = this;
		var conf = this.conf;
		var maxid = 0;

		///////////////

		//最近一次朋友圈消息ID
		this.redis.get( this.stamp, ( err, ret ) => {
			maxid = ret || maxid;
		} );

		//每分钟获取一次朋友圈
		setInterval(function () {

			//工作时段
			var date = new Date();
			var work = date.format('h') >= conf.worked;

			if( !work ) return;

			let pm = self.fetchMoment( conf.wechat, conf.follow.moment );

			pm.then(ret => {

				var post = ret.objectList[0];

				//转发朋友圈
				if( post.id > maxid ){
					self.send( post );
					maxid = post.id;
				}else{					
					console.log( '暂无发圈', post.id );
				}

				self.redis.set( self.stamp, post.id );

				req.status(conf.report, 'MM_Moment', maxid, ret.baseResponse);

			}).catch(err => {

				console.log( err );

				req.status(conf.report, 'MM_Moment', maxid, err);

			});

		}, 60 * 1000 * 5 );

	}

	/**
     * 循环发送朋友圈
     */
	send(post) {

		var send = true;

		//需要忽略的发圈
		if( post.commentUserListCount ){
			for( let i = 0; i < post.commentUserList.length; i ++ ){
				let comm = post.commentUserList[i].content.toLocaleUpperCase();
				if( comm == this.conf.ignore ){
					send = false;
					console.log( '跳过发圈', comm );
				}
			}
		}

		///////////////////

		var self = this;

		send && this.mysql.query('SELECT member_id, weixin_id FROM `pre_member_weixin` WHERE moment > 0 ORDER BY auto_id ASC', function (err, res) {

			if( err ){
				console.log( err );
				return;
			}else{
				console.log( '本次发圈', res.length + ' 人，评论', post.commentUserListCount + ' 条' );
			}

			for (let i = 0; i < res.length; i++) {

				let row = res[i];

				//转发朋友圈
				self.forwardMoment(row.weixin_id, post, row);

				//更新发圈时间
				self.mysql.query('UPDATE `pre_member_weixin` SET moment_time = UNIX_TIMESTAMP() WHERE member_id = ?', [ row.member_id ] );

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
	 * @param int 来源ID
	 */
	fetchMoment(wxid, toWxId, maxid = 0, source = 0) {
		var pm = this.wx.SnsUserPage(wxid, toWxId, maxid, source);
		return pm;
	}

	/**
	 * 转发朋友圈
	 * @param string 微信ID
	 * @param object 发圈数据
	 * @param object 原始记录
	 */
	forwardMoment(wxid, post, row) {

		let buffer = post.objectDesc.string;

		//let texts = /<contentDesc><\!\[CDATA\[(.+?)\]\]><\/contentDesc>/.exec(buffer)[1];

		//let media = /<mediaList>(.+?)<\/mediaList>/.exec(buffer)[1];

		let pm = this.wx.SnsPostXml(wxid, buffer);

		pm.then(ret => {

			//自己的发圈ID
			post.id = ret.snsObject.id;

			this.forwardComment(wxid, post, row);

			console.log(ret);

			console.log('----------------------');

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

		var self = this;

		if (post.commentUserListCount > 0) {

			for( let i = 0; i < post.commentUserList.length; i ++ ){

				let comm = post.commentUserList[i];

				//console.log(comm);

				//转链
				req.get(self.conf.convert, { 'member_id' : row.member_id, 'text' : comm.content }, (code, body) => {

					var data = JSON.parse( body );
					
					if( data.status >= 0 ){
						var body = data.result;
					}else{
						console.log('转链错误', data);
						return;
					}

					//评论
					let pm = self.wx.SnsComment(wxid, post.id, comm.type, body);

					pm.then(ret => {
						//console.log('评论成功', ret.snsObject.objectDesc.commentUserList);
						console.log('评论成功', ret);
					}).catch(err => {
						console.log('SnsComment', err);
					});

				}, ( data ) =>{

					var conv = act.detectTbc( data.text ) || act.detectUrl( data.text );

					console.log('是否转链', conv, data.text );

					//是口令，需要转链
					if( conv ){
						return { 'request' : true };
					}else{
						return { 'request' : false, 'respond' : JSON.stringify( { 'status' : 0, 'result' : data.text } ) };
					}

				} );

			}

			//return pm;

		}

	}

}

module.exports = Moment;