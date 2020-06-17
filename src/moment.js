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
		this.delay = [];
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

			let pm = self.fetchMoment( conf.wechat, conf.moment.follow );

			pm.then(ret => {

				let post = ret.objectList[0];

				//转发朋友圈
				if( post.id > maxid ){
					self.send( post );
					maxid = post.id;
					//log.info( '最新发圈', post );
				}else{					
					log.info( '暂无发圈', { 'maxid' : maxid, 'post.id' : post.id, 'post.time' : post.createTime } );
				}

				//临时存储一小时
				self.redis.set( self.stamp, post.id );
				self.redis.expire( self.stamp, 3600 * 14 );

				req.status(conf.report, 'MM_Moment', maxid, ret.baseResponse);

			}).catch(err => {

				log.info( err );

				req.status(conf.report, 'MM_Moment', maxid, err);

			});

		}, 60 * 1000 * 9 );

		//每分钟补发一次
		setInterval( this.reissueComment.bind(this), 60 * 990 );

	}

	/**
     * 循环发送朋友圈
     */
	send(post) {

		var self = this;
		var time = com.getTime() - 60 * 15;
		var data = self.parseMoment( post );

		//昨天时间
		var last = com.strtotime('-1 day');
		var date = new Date(last * 1000).format('yyyyMMdd');

		var func = ( auto ) => {

			self.mysql.query('SELECT auto_id, member_id, weixin_id FROM `pre_member_weixin` WHERE moment > 0 AND created_date <= ? AND heartbeat_time >= ? AND auto_id > ? ORDER BY auto_id ASC LIMIT 50', [date, time, auto], function (err, res) {

				if( err ){
					log.error( err );
					return;
				}

				if( res.length == 0 ){
					log.info( '处理完毕', time );
					return;
				}else{
					log.info( '本次发圈', res.length + ' 人，评论 ' + data.comment.length + ' 条' );
				}
	
				for (var i = 0; i < res.length; i++) {
	
					//转发朋友圈
					self.forwardMoment(res[i], data);
	
					//更新发圈时间
					self.mysql.query('UPDATE `pre_member_weixin` SET moment_time = UNIX_TIMESTAMP() WHERE member_id = ?', [ res[i].member_id ] );
	
				}

				//再次执行，传入最后ID
				setTimeout( () => { func( res[i - 1].auto_id ); }, 1000 );
	
			});

		};

		//开始执行
		data.sending && func( 0 );

	}

	/**
	 * 预处理朋友圈
	 * @param object 发圈数据
	 */
	parseMoment( post ){

		var conf = this.conf.moment;
		
		//构造数据包
		var data = {

			//内容主体
			subject: post.objectDesc.string,

			//是否发送
			sending: true,

			//是否转链
			convert: 0,

			//评论列表，{ exch, type, text }
			comment: [],

		}

		//需要忽略的发圈
		if( post.commentUserListCount ){

			for( let i = 0; i < post.commentUserList.length; i ++ ){

				let type = post.commentUserList[i].type;
				let text = post.commentUserList[i].content;
				let comm = text.toLocaleUpperCase();
				let exch = act.detectTbc( text ) || act.detectUrl( text );
					exch && data.convert ++;

				if( comm == conf.ignore ){
					data.sending = false;
					log.info( '跳过发圈', comm );
				}

				if( comm == conf.origin ){
					data.convert = 0;
					log.info( '不要转链', comm );
				}

				data.comment.push( { exch, type, text } );

			}

		}

		log.info( '发圈数据', data );

		return data;

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
	forwardMoment(member, data) {

		let pm = this.wx.SnsPostXml(member.weixin_id, data.subject);

		pm.then(ret => {

			//转发评论，使用自己的发圈ID
			this.forwardComment(member, data, ret.snsObject.id);

			log.info( '发圈成功', ret.snsObject.id );

		}).catch(err => {
			log.error( '发圈出错', [member.member_id, err] );
		});

		return pm;

	}

	/**
	 * 转发评论
	 * @param object 用户数据
	 * @param object 发圈数据
	 * @param integer 发圈ID
	 * @param integer 延迟时间
	 */
	forwardComment(member, data, post_id, lazy_time = 0) {

		var self = this;

		for( let i = 0; i < data.comment.length; i ++ ){

			let comm = data.comment[i];
			let last = i == data.comment.length - 1;

			//转链
			req.get(self.conf.convert, { 'member_id' : member.member_id, 'text' : comm.text, 'lazy_time' : lazy_time }, (code, body) => {

				try {
					if( typeof body == 'string' ){
						body = JSON.parse( body );
					}
				} catch( e ){
					body = { 'status' : -code, 'body' : body, 'error' : e.toString() };
				}

				log.info( '转链结果', [member.member_id, body, lazy_time] );

				///////////////
				
				if( body.status >= 0 ){

					//评论
					let pm = self.wx.SnsComment(member.weixin_id, post_id, comm.type, body.result);

					pm.then(ret => {
						log.info( '评论成功', [member.weixin_id, post_id, ret.snsObject.id] );
					}).catch(err => {
						log.error( '评论失败', [member.weixin_id, err] );
					});

				}else{

					body.source = 'moment';
					body.lazy_time = lazy_time;

					self.mysql.query('UPDATE `pre_member_weixin` SET status = ?, status_time = ? WHERE member_id = ?', [ JSON.stringify( body ), com.getTime(), member.member_id ] );

					//是延迟补发的消息，删除这条朋友圈，否则写入延迟消息
					if( lazy_time ){
						self.wx.SnsObjectOp( member.weixin_id, post_id, 1 );
						log.error('删除发圈', [member.weixin_id, post_id, lazy_time]);
						//self.wx.SnsComment(member.weixin_id, post_id, comm.type, 'DEL');
					}else{
						self.delay.push( { member, data, post_id, time : com.getTime() } );
					}

				}

			}, ( data ) =>{

				//是口令，需要转链
				if( comm.exch ){
					return { 'request' : true };
				}else{
					return { 'request' : false, 'respond' : { 'status' : 0, 'result' : data.text } };
				}

			} );

		}

	}

	/**
	 * 补发评论
	 */
	reissueComment() {

		var size = this.delay.length;

		if( size == 0 ){
			log.info( '暂无延迟', { 'delay': size } );
			return;
		}

		var size = size > 20 ? 20 : size;
		var time = com.getTime() - 59 * 5;

		for( let i = 0; i < size; i++ ){

			let item = this.delay.shift();

			//超过 5 分钟，执行补发，否则还回去
			if( item.time <= time ){
				this.forwardComment( item.member, item.data, item.post_id, item.time );
				log.info( '补发消息', item );
			}else{
				this.delay.unshift( item );
			}

		}

	}

}

module.exports = Moment;