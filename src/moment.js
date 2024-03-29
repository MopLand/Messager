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
		this.sider = com.redis(conf.redis);
		this.mysql = com.mysql(conf.mysql, (db => { this.mysql = db; }).bind(this));
		this.delay = [];
		this.abort = false;
	}

	init( item = 'moment' ){

		var self = this;
		var conf = this.conf;
		var inst = this.conf[item];
		var maxid = 0;

		var followApi = 'https://proxy.guodongbaohe.com/assets/wechat/' + item;

		//消息时间戳
		var stamp = inst.marker || 'mm_moment_id';

		///////////////

		this.item = item;
		this.inst = inst;

		// 没评论拉取次数
		this.pullcomment = 0;

		//最近一次朋友圈消息ID
		this.redis.get( stamp, ( err, ret ) => {
			self.maxid = ret || maxid;
			log.info( 'init', self.maxid );
		} );

		//每分钟获取一次朋友圈
		setInterval(function () {

			//工作时段
			var date = new Date();
			var workHours = date.format('h');

			var work = workHours >= conf.worked || workHours < 3; // 工作时间段 0-3 6-24

			if( !work || conf.follow ) return;

			// 微信配置
			let wechatConfig = self.wechatConfig || [];

			// 获取后台配置微信号
			req.get(followApi, {}, (code, body) => {

				try {
					if ( typeof body == 'string' ) {
						body = JSON.parse(body);
						log.info('微信配置', body);
					}
				} catch ( e ) {
					body = { 'status': -code, 'body': body, 'error': e.toString() };
					log.error('微信监控号', [item, body]);
				}
				
				let follows = inst.follow.split(',');

				if( body.status >= 0 ){
					follows = body.result;
					self.wechatConfig = follows;
				}

				// self.mainWx = '';

				// 拉取多账号，第一个有数据发送 否则 继续拉取第二个
				let loopSend = () => {

					let onFollow = follows.shift();

					self.getMoment( conf.wechat, onFollow, self.maxid, stamp, conf, ( firstData ) => {

						if ( follows.length > 0 && !firstData ) {
							loopSend();
						}
					} );
				}

				loopSend();

			}, ( data ) => {
				
				let workMin = date.format('m');

				if( wechatConfig.length == 0 || ( workMin > 0 && workMin < 9 ) || ( workMin > 30 && workMin < 39 ) ){
					return { 'request' : true };
				}else{
					return { 'request' : false, 'respond' : { 'status' : 1, 'result' : wechatConfig } };
				}
			})

		}, 60 * 1000 * 5 );

		//每分钟补发一次
		setInterval( this.reissueComment.bind(this), 60 * 1000 );

	}

	/**
	 * 获取朋友圈信息
	 * @param {String} wechat
	 * @param {String} follow
	 * @param {String} maxid
	 * @param {String} stamp
	 * @param {Object} conf
	 * @param {Function} func
	 */
	getMoment(wechat, follow, maxid, stamp, conf, func) {
		var self = this;

		// if ( self.mainWx == '' ) {
		// 	self.mainWx = follow;
		// }

		// 多账号，，如果有新数据，则第二个监听
		let firstData = false;

		let pm = self.fetchMoment( wechat, follow );

		pm.then(ret => {

			let post = ret.objectList && ret.objectList[0] ? ret.objectList[0] : {};

			// 评论为空时：
			// 配置项 nocomment 为空或者false 则必需有评论
			// 配置项 nocomment 为 true 但是 拉取次数(pullcomment)为 0 时， pullcomment=1 等待下一次拉取
			if( post.commentUserListCount == 0 && ( !self.inst.nocomment || (self.inst.nocomment && self.pullcomment == 0) ) ){

				// 评论不是必须时，评论为空拉取次数 = 1
				if ( self.inst.nocomment ) {
					self.pullcomment = 1;
				}

				log.info( '暂无评论', { 'post.data' : post, 'post.time' : post.createTime } );
				return;
			}

			// 拉取次数还原 0；
			self.pullcomment = 0;

			//转发朋友圈
			if( post.id > maxid ){
				
				firstData = true;

				self.send( post );
				self.maxid = post.id;
				//log.info( '最新发圈', post );

			}else{
				log.info( '暂无发圈', { 'maxid' : maxid, 'post.id' : post.id, 'post.time' : post.createTime } );
			}

			act.record( self.mysql, self.item, post, '发圈消息' );

			// 存储发圈消息ID
			let saveTime = maxid;
			if ( post.id > maxid ) {
				saveTime = post.id;
			}

			//临时存储一天
			self.redis.set( stamp, saveTime );
			self.redis.expire( stamp, 3600 * 14 );

			req.status(conf.report, 'MM_Moment', maxid, ret.baseResponse);

			func( firstData );

		}).catch(err => {

			log.info( err );

			req.status(conf.report, 'MM_Moment', maxid, err);

			func( firstData );
		});
	}

	/**
     * 循环发送朋友圈
     */
	send(post) {

		var self = this;
		var time = com.getTime() - self.conf.active;
		var data = self.parseMoment( post );

		// 72 小时前时间
		var last = com.strtotime('-3 day');
		var date = new Date(last * 1000).format('yyyyMMdd');
		
		//取消中断
		self.abort = false;

		var func = ( auto ) => {

			// if( self.abort ){
			// 	return log.error( '中断发送', self.abort );
			// }

			//锁定 GIT
			if( auto == 0 ){
				com.locked( self.item );
			}

			let sql = 'SELECT w.`auto_id`, w.`member_id`, w.`weixin_id`, w.`tag`, m.`invite_code` FROM `pre_weixin_list` AS w LEFT JOIN `pre_member_list` AS m ON w.`member_id` = m.`member_id` WHERE w.auto_id > ? AND w.created_date <= ? AND ' + self.item + ' = 1 AND w.online = 1 ORDER BY w.auto_id ASC LIMIT 50';

			self.mysql.query(sql, [auto, date], function (err, res) {

				if( err ){
					return log.error( '读取错误', err );
				}

				//发送完成，解锁 GIT
				if( res.length == 0 ){
					com.unlock( self.item );
					act.record( self.mysql, self.item, { 'heartbeat_time' : time, 'auto_id' : auto }, '发送完成' );
					return log.info( '处理完毕', time );
				}else{
					act.record( self.mysql, self.item, { 'quantity' : res.length, 'members' : res }, '批次用户' );
					log.info( '本次发圈', res.length + ' 人，评论 ' + data.comment.length + ' 条，位置 ' + auto );
				}
	
				for (var i = 0; i < res.length; i++) {

					if ( self.item == 'moment_mtl' && res[i] && res[i].tag && ( res[i].tag & 8 )) {
						continue;
					}
	
					//转发朋友圈
					self.forwardMoment(res[i], data);
	
					//更新发圈时间
					self.mysql.query('UPDATE `pre_weixin_list` SET moment_send = IF( DATEDIFF(NOW(), FROM_UNIXTIME(moment_time) ) > 0, 0, moment_send ) + 1, moment_time = UNIX_TIMESTAMP() WHERE member_id = ? AND weixin_id = ?', [ res[i].member_id, res[i].weixin_id ] );
	
				}

				//再次执行，传入最后ID
				setTimeout( () => { func( res[i - 1].auto_id ); }, 2000 );
	
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

			//朋友圈消息id
			package: post.id,

			//创建时间
			created: com.getTime(),

		}

		//需要忽略的发圈
		if( post.commentUserListCount ){

			for( let i = 0; i < post.commentUserList.length; i ++ ){

				let username = post.userName;
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

				data.comment.push( { exch, type, text, username } );

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
			let comment = com.clone( data );
			this.forwardComment(member, comment, ret.snsObject.id);

			log.info( '发圈成功', ret.snsObject.id );

		}).catch(err => {

			let body = { api:'SnsPostXml', err, isAbort: false };
			
			//判定为垃圾消息
			if( typeof err == 'string' && self.inst.cancel ){
				var ret = err.match( self.inst.cancel );
				if( ret ){
					self.abort = ret[0];

					// 营销素材 判定为垃圾消息则禁发素材
					if (self.item == 'moment_mtl') {
						body.isAbort = true;
					}
				}
			}

			log.error( '发圈出错', [member.member_id, err] );
			act.updatePushed( self.mysql, member, body);

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
	async forwardComment(member, data, post_id, lazy_time = 0) {

		var self = this;
		let rkey = this.item + '_active';

		for( let i = 0; i < data.comment.length; i ++ ){

			let comm = data.comment[i];
			let last = i == data.comment.length - 1;

			if ( !comm.noreplace ) {
				// 判断个人商城链接
				log.info( '邀请码', [ member.member_id, member.invite_code, comm ] );
				comm.text = act.replaceUserid( act.replaceInvite( comm.text, member.invite_code ), member.member_id );
			}

			let extstr = comm.exch ? act.getExternal( comm.text ) : '';

			//转链
			req.get( self.conf.convert, { 'member_id' : member.member_id, 'text' : comm.text, 'product' : 'true', 'lazy_time' : lazy_time, 'source': 'yfd', 'external': extstr }, (code, body) => {

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

						if ( self.item == 'moment' && body.product ) {
							for(let k in body.product) {
								act.collect( self, 'moment', {
									"platform": body.product[k],
									"item_id": k,
								}, data, comm);
							}
						}

					}).catch(err => {

						log.error( '评论失败', [member.weixin_id, err] );
						act.updatePushed( self.mysql, member, { api:'SnsComment', act:'text', err } );

						////////
						
						setTimeout(() => {
							self.wx.SnsObjectOp( member.weixin_id, post_id, 1 );
							log.error('删除发圈', [member.weixin_id, post_id, lazy_time]);
						}, 15000);
					});

					//////////////

					//口令链接
					let kl = act.extractTbc( body.result );

					if( kl && ( member.tag & 1 ) > 0 ){
						
						let lm = self.wx.SnsComment(member.weixin_id, post_id, comm.type, '下单链接 http://wx.bhurl.net/wx?c=' + kl );

						lm.then(ret => {
							log.info( '链接成功', [member.weixin_id, post_id, ret.snsObject.id] );
						}).catch(err => {
							log.error( '链接失败', [member.weixin_id, err] );
							act.updatePushed( self.mysql, member, { api:'SnsComment', act:'link', err } );
						});

					}

					//////////////

					//最后发圈时间
					self.sider.set( rkey, com.getTime() );
					self.sider.expire( rkey, 7200 );

				}else{

					body.err	= '转链失败';
					body.source = 'moment';
					body.lazy_time = lazy_time;

					let beian = body.special && 'beian' == body.special;

					//self.mysql.query('UPDATE `pre_weixin_list` SET status = ?, status_time = ? WHERE member_id = ?', [ JSON.stringify( body ), com.getTime(), member.member_id ] );

					act.updatePushed( self.mysql, member, body );

					//是延迟补发的消息，删除这条朋友圈，否则写入延迟消息
					if( beian || lazy_time ){
						self.wx.SnsObjectOp( member.weixin_id, post_id, 1 );
						log.error('删除发圈', [member.weixin_id, post_id, lazy_time]);
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

			}, self.conf.options );

			if (i < (data.comment.length - 1) && comm.exch) {
				await com.sleep(2000);
			}

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