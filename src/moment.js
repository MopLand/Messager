'use strict'

/**
 * 朋友圈控制器
 */

const wx = require('../lib/weixin');
const com = require('../lib/common');
const req = require('../lib/request');
const act = require('../lib/activity');
const Logger = require('../lib/logger');
const tag = com.fileName( __filename, false );
const log = new Logger( tag );

class Moment {

    /**
     * 构造函数
     */
	constructor(conf) {
		this.conf = conf;
		this.wx = new wx(conf.weixin);
		this.redis = com.redis(conf.redis);
		this.mysql = com.mysql(conf.mysql, (db => { this.mysql = db; }).bind(this));
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
			log.info( 'init', maxid );
		} );

		//每分钟获取一次朋友圈
		setInterval(function () {

			//工作时段
			var date = new Date();
			var work = date.format('h') >= conf.worked;

			if( !work ) return;

			let pm = self.fetchMoment( conf.wechat, conf.follow.moment );

			pm.then(ret => {

				let post = ret.objectList[0];

				//转发朋友圈
				if( post.id > maxid ){
					self.send( post );
					maxid = post.id;
					log.info( '最新发圈', post );
				}else{					
					log.info( '暂无发圈', post.id );
				}

				//临时存储一小时
				self.redis.set( self.stamp, post.id );
				self.redis.expire( self.stamp, 3600 );

				req.status(conf.report, 'MM_Moment', maxid, ret.baseResponse);

			}).catch(err => {

				log.info( err );

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
					log.info( '跳过发圈', comm );
				}
			}
		}

		///////////////////

		var self = this;
		var time = com.getTime() - 60 * 15;

		send && this.mysql.query('SELECT member_id, weixin_id FROM `pre_member_weixin` WHERE moment > 0 AND heartbeat_time >= ? ORDER BY auto_id ASC', [time], function (err, res) {

			if( err ){
				log.error( err );
				return;
			}else{
				log.info( '本次发圈', res.length + ' 人，评论' + post.commentUserListCount + ' 条' );
			}

			for (let i = 0; i < res.length; i++) {

				let member = res[i];

				//转发朋友圈
				self.forwardMoment(member, post);

				//更新发圈时间
				self.mysql.query('UPDATE `pre_member_weixin` SET moment_time = UNIX_TIMESTAMP() WHERE member_id = ?', [ member.member_id ] );

			}

		});

	}

	/**
	 * 发送消息
	 * @param string 微信ID
	 * @param integer 类型
	 * @param string 内容
	 */
	sendMoment(wxid, type, content) {

		var pm = this.wx.SendFriendCircle(wxid, type, content);

		pm.then(ret => {
			log.info(ret);
		}).catch(err => {
			log.error(err);
		});

		return pm;

	}

	/**
	 * 获取最新发圈
	 * @param string 微信ID
	 * @param integer 好友ID
	 * @param integer 上一次消息ID
	 * @param integer 来源ID
	 */
	fetchMoment(wxid, toWxId, maxid = 0, source = 0) {
		var pm = this.wx.SnsUserPage(wxid, toWxId, maxid, source);
		return pm;
	}

	/**
	 * 转发朋友圈
	 * @param object 用户数据
	 * @param object 发圈数据
	 */
	forwardMoment(member, post) {

		let buffer = post.objectDesc.string;
		let pm = this.wx.SnsPostXml(member.weixin_id, buffer);

		pm.then(ret => {

			//转发评论，使用自己的发圈ID
			this.forwardComment(member, post, ret.snsObject.id);

			log.info(ret);

		}).catch(msg => {
			log.error(err);
		});

		return pm;

	}

	/**
	 * 转发发圈评论
	 * @param object 用户数据
	 * @param object 发圈数据
	 * @param integer 发圈ID
	 */
	forwardComment(member, post, post_id) {

		var self = this;

		if (post.commentUserListCount > 0) {

			for( let i = 0; i < post.commentUserList.length; i ++ ){

				let comm = post.commentUserList[i];

				//转链
				req.get(self.conf.convert, { 'member_id' : member.member_id, 'text' : comm.content }, (code, body) => {

					var data = JSON.parse( body );
					
					if( data.status >= 0 ){

						//评论
						let pm = self.wx.SnsComment(member.weixin_id, post_id, comm.type, data.result);

						pm.then(ret => {
							log.info('评论成功', ret);
						}).catch(err => {
							log.error('评论失败', err);
						});

					}else{

						log.error('转链错误', data);

						self.mysql.query('UPDATE `pre_member_weixin` SET status = ?, updated_time = ? WHERE member_id = ?', [ body, com.getTime(), member.member_id ] );

					}

				}, ( data ) =>{

					var conv = act.detectTbc( data.text ) || act.detectUrl( data.text );

					log.debug('是否转链', conv, data.text );

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