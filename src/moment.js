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
		this.inst = {};
		this.conf = conf;
		this.wx = new wx( conf.weixin, conf.reserve, conf.special );
		this.redis = com.redis(conf.redis);
		this.mysql = com.mysql(conf.mysql, (db => { this.mysql = db; }).bind(this));
		this.delay = [];
		this.abort = false;
	}

	init( item = 'moment' ){

		var self = this;
		var conf = this.conf;
		var inst = this.conf[item];
		var maxid = 0;

		//消息时间戳
		var stamp = inst.marker || 'mm_moment_id';

		///////////////

		this.inst = inst;

		//最近一次朋友圈消息ID
		this.redis.get( stamp, ( err, ret ) => {
			maxid = ret || maxid;
			log.info( 'init', maxid );
		} );

		//每分钟获取一次朋友圈
		setInterval(function () {

			//工作时段
			var date = new Date();
			var work = date.format('h') >= conf.worked;

			if( !work ) return;

			let pm = self.fetchMoment( conf.wechat, inst.follow );

			pm.then(ret => {

				let post = ret.objectList[0];

				//必需有评论
				if( post.commentUserListCount == 0 ){
					log.info( '暂无评论', { 'post.data' : post, 'post.time' : post.createTime } );
					return;
				}

				//转发朋友圈
				if( post.id > maxid ){
					self.send( post );
					maxid = post.id;
					//log.info( '最新发圈', post );
				}else{
					log.info( '暂无发圈', { 'maxid' : maxid, 'post.id' : post.id, 'post.time' : post.createTime } );
				}

				//临时存储一天
				self.redis.set( stamp, post.id );
				self.redis.expire( stamp, 3600 * 14 );

				req.status(conf.report, 'MM_Moment', maxid, ret.baseResponse);

			}).catch(err => {

				log.info( err );

				req.status(conf.report, 'MM_Moment', maxid, err);

			});

		}, 60 * 1000 * 5 );

		//每分钟补发一次
		setInterval( this.reissueComment.bind(this), 60 * 1000 );

	}

	/**
     * 循环发送朋友圈
     */
	send(post) {

		var self = this;
		var time = com.getTime() - self.conf.active;
		var data = self.parseMoment( post );

		//昨天时间
		var last = com.strtotime('-1 day');
		var date = new Date(last * 1000).format('yyyyMMdd');
		
		//取消中断
		self.abort = false;

		var func = ( auto ) => {

			if( self.abort ){
				return log.error( '中断发送', self.abort );
			}

			self.mysql.query('SELECT auto_id, member_id, weixin_id, tag FROM `pre_member_weixin` WHERE moment = 1 AND created_date <= ? AND heartbeat_time >= ? AND auto_id > ? ORDER BY auto_id ASC LIMIT 50', [date, time, auto], function (err, res) {

				if( err ){
					return log.error( '读取错误', err );
				}

				if( res.length == 0 ){
					return log.info( '处理完毕', time );
				}else{
					log.info( '本次发圈', res.length + ' 人，评论 ' + data.comment.length + ' 条，位置 ' + auto );
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
     * 更新状态
     * @param integer 用户Id
     * @param object 状态信息
     */
	status( member_id, body ) {

		var pushed = null;

		if( typeof body.err == 'string' && body.err.indexOf('退出微信') > -1 ){
			pushed = '请检查微信是否在登录状态?';
		}

		return this.mysql.query('UPDATE `pre_member_weixin` SET pushed = ?, status = ?, status_time = ? WHERE member_id = ?', [ pushed, JSON.stringify( body ), com.getTime(), member_id ] );
	}

	/**
	 * 预处理朋友圈
	 * @param object 发圈数据
	 */
	parseMoment( post ){

		var conf = this.inst;
		
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
				let exch = false;

				if( comm == conf.ignore ){
					data.sending = false;
					log.info( '跳过发圈', comm );
				}

				if( conf.origin && conf.origin.test( comm ) ){
					data.convert = 0;
					log.info( '不要转链', comm );
				}else{
					exch = act.detectTbc( text ) || act.detectUrl( text );
					exch && data.convert ++;
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

		let self = this;
		let text = data.subject;

		//追加消息尾巴
		//<contentDesc><![CDATA[ MSG_DATA ]]></contentDesc>
		/*
		if( member.weixin_id == 'wxid_okvkiyguz1yh22' && this.conf.slogan ){
			text = text.replace( /(\]\]><\/contentDesc>)/g, '\n' + com.sliced( this.conf.slogan ) + '$1' );
		}
		*/

		let pm = this.wx.SnsPostXml(member.weixin_id, text);

		pm.then(ret => {

			//转发评论，使用自己的发圈ID
			this.forwardComment(member, data, ret.snsObject.id);

			log.info( '发圈成功', ret.snsObject.id );

		}).catch(err => {

			log.error( '发圈出错', [member.member_id, err] );
			self.status( member.member_id, { api:'SnsPostXml', err } );

			//判定为垃圾消息
			if( typeof err == 'string' && self.inst.cancel ){
				var ret = err.match( self.inst.cancel );
				if( ret ){
					self.abort = ret[0];
				}
			}

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
			req.get(self.conf.convert, { 'member_id' : member.member_id, 'text' : comm.text, 'product' : 'true', 'lazy_time' : lazy_time }, (code, body) => {

				try {
					if( typeof body == 'string' ){
						body = JSON.parse( body );
					}
				} catch( e ){
					body = { 'status' : -code, 'body' : body, 'error' : e.toString() };
				}

				log.info( '转链结果', [member.member_id, body, lazy_time] );

				///////////////
				
				//成功转链数量
				if( body.status > 0 ){

					//评论
					let pm = self.wx.SnsComment(member.weixin_id, post_id, comm.type, body.result);

					pm.then(ret => {

						log.info( '评论成功', [member.weixin_id, post_id, ret.snsObject.id] );

						body.product && act.collect( self.mysql, 'moment', body.product );

					}).catch(err => {

						log.error( '评论失败', [member.weixin_id, err] );
						self.status( member.member_id, { api:'SnsComment', act:'text', err } );
					});

					//////////////

					//链接
					let kl = act.extractTbc( body.result );

					if( kl && member.tag > 0 ){
						
						let lm = self.wx.SnsComment(member.weixin_id, post_id, comm.type, '下单链接 http://wx.bhurl.net/wx?c=' + kl );

						lm.then(ret => {
							log.info( '链接成功', [member.weixin_id, post_id, ret.snsObject.id] );
						}).catch(err => {
							log.error( '链接失败', [member.weixin_id, err] );
							self.status( member.member_id, { api:'SnsComment', act:'link', err } );
						});

					}

				}else{

					body.source = 'moment';
					body.lazy_time = lazy_time;

					//self.mysql.query('UPDATE `pre_member_weixin` SET status = ?, status_time = ? WHERE member_id = ?', [ JSON.stringify( body ), com.getTime(), member.member_id ] );

					self.status( member.member_id, body );

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
				if( comm.exch && ( member.tag & 4 ) == 0 ){
					return { 'request' : true };
				}else{
					return { 'request' : false, 'respond' : { 'status' : 1, 'result' : data.text } };
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