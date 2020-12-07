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

/**
 * 用户 TAG
 * 1 ： '测试通道'
 * 2 ： '禁小程序'
 * 4 ： '禁止转链'
 * 8 ： 'example'
 */

class Groups {

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
		this.members = [];
		this.updated = 0;
		this.queues = [];
		this.locked = 0;
		this.sender = 0;
	}

	init( item = 'groups' ){

		//日志清理
		log.clean();

		var conf = this.conf;
		var inst = this.conf[item];

		//监听的微信号
		var wechat = inst.wechat || conf.wechat;

		//消息时间戳
		var marker = inst.marker || 'mm_groups_id';

		//Redis消息频道
		var channel = inst.channel || 'mm_groups';

		///////////////

		//消息筛选条件
		var where = {}

		this.item = item;
		this.inst = inst;

		if( inst.follow ){
			where.fromUserName = inst.follow;
		}

		if( inst.talker ){
			where.speaker = inst.talker + ':\n';
		}

		if( inst.detect ){
			where.allowed = inst.detect;
		}
		
		log.info( '监听条件', { where, instance : inst } );

		///////////////

		//订阅消息发送
		this.subscribe( wechat, marker, channel, where );

		//////////

		/*
		req.get(this.conf.convert, { 'member_id' : 10008, 'text' : 'content', 'product' : 'true' }, (code, body) => {
				
			console.log( body );

		}, ( data ) =>{

			return { 'request' : true };

		}, this.conf.options );
		*/

		////////////

		/*
		var a = [1, 2, { a: 3, b: 4 }];
		var b = com.clone( a );

		//console.log( a, b, typeof b, Array.isArray(a), a == b );

		a.shift();
		console.log( a, b );
		*/

		////////////

		/*
		var a = { a: 1, b: 2, c: [1,2,3] };
		var b = com.clone( a );

		console.log( a, b, typeof b, Array.isArray(a), a == b );
		*/

	}

	/**
     * 循环发送微信群
	 * @param object 消息数据
     */
	send( data ) {

		var self = this;

		self.getMember( () => {

			//获取用户副本，限定每分钟发送量，并计算每人所需间隔时间
			var user = com.clone( self.members );
			var size = user.length;
			var mins = size / 500;
			var span = ( mins * 60 * 1000 ) / size;

			var func = ( i ) => {

				//预处理消息
				self.parseMessage( user[i], data );

				//开始发消息
				//if( i > 0 ){
				//	self.forwardMessage( i == size - 1 );
				//}

				//下一下用户
				if( i < size - 1 ){
					setTimeout( () => { func( i + 1 ); }, span );
				}

				//本地测试，单用户
				if( size == 1 ){
					setTimeout( self.forwardMessage.bind( self ), span );
				}

				////////////

				//锁定 GIT
				if( i == 0 ){
					self.setLocked( self.item, user[ size - 1 ], data.package );
				}

			}

			//开始执行
			func( 0 );

		} );

	}

	/**
	 * 设置消息锁
	 * @param string 锁名称
	 * @param object 最后一个用户
	 * @param string 消息ID
	 */
	setLocked( item, last, pakId ){

		var self = this;
		var clok = setInterval( () => {

			//队列中还有消息
			if( self.queues.length ){
				return;
			}

			//消息可能还在发送中
			if( com.getTime() - self.sender <= 30 ){
				return;
			}

			//清掉发送状态
			self.sender = 0;

			//删除锁文件
			com.unlock( item );
			act.record( self.mysql, self.item, { 'quantity' : self.members.length, 'package' : pakId, 'last_man' : last }, '发送完成' );

			//清除定时器
			clearInterval( clok );

		}, 1000 * 10 );

		///////////////

		//创建锁文件
		com.locked( item );

		//开始发送状态
		self.sender = com.getTime();

	}

	/**
     * 订阅消息
     * @param string 微信ID
     * @param string 消息标记
     * @param string 消息频道
     * @param object 消息过滤
     */
	subscribe( wechat, marker, channel, where ) {

		let self = this;
		let wait = 60;
		let keybuf = '';

		//最近一次微信群消息ID
		this.sider.get( marker, ( err, ret ) => {
			keybuf = ret || keybuf;
			//log.info( item, keybuf );
		} );

		//处理 Redis 消息
		this.redis.on('message', function (channel, message) {

			let recv = JSON.parse( message );

			//正在读取消息，锁还未失效
			if( self.locked && self.locked >= com.getTime() - wait ){
				log.info( '读消息锁', self.locked );
				return;
			}else{
				self.locked = com.getTime();
				log.info( '拉取方式', { channel, message } );
			}

			let pm = self.wx.NewSync( wechat, keybuf );

			pm.then(ret => {

				log.info( '原始消息', ret.cmdList.list );

				//获取最新消息
				var data = self.filterMessage( recv.msgid, ret.cmdList.list, where );
				var size = data.message.length;
				var find = false;

				//发送最新消息
				if( size ){
					self.send( data );
					find = data.message.find( ele => {
						return ele.rowid == recv.msgid;
					} );
				}
				
				log.info( '消息数量', { '通知ID' : recv.msgid, 'Continue' : ret.continueFlag, '原消息' : ret.cmdList.count, '筛选后' : size } );
				log.info( '有效消息', data );
				
				//记录消息标记
				keybuf = ret.keyBuf.buffer;

				//临时存储一天
				self.sider.set( marker, keybuf );
				self.sider.expire( marker, 3600 * 14 );
				
				act.record( self.mysql, self.item, data, '发群消息' );

				//消息不完整
				if( !find && recv.event != 'pull' ){
					setTimeout( () => { self.sider.publish( channel, JSON.stringify( { 'event' : 'pull', 'msgid' : recv.msgid } ) ); }, 1000 * 30 );
				}

				req.status(self.conf.report, 'MM_Groups', size, { '原始消息' : ret.cmdList.count, '通知ID' : recv.msgid, '拉取ID' : find } );

			}).catch(err => {

				log.info( '读取错误', err );

				req.status(self.conf.report, 'MM_Groups', 500, err);

			}).finally( () => {

				//解除读消息锁
				self.locked = 0;

			});

		});

		//订阅 Redis 频道消息
		this.redis.subscribe( channel );

	}

	/**
	 * 拉取有效用户
     * @param function 回调方法
	 */
	getMember( func ) {

		var self = this;

		//用户列表最近 5 分钟内更新过
		if( self.members.length && com.getTime() - self.updated <= 60 * 5 ){
			return func();
		}

		/////////

		//昨天时间
		var last = com.strtotime('-1 day');
		var date = new Date(last * 1000).format('yyyyMMdd');

		//二十分钟
		var time = com.getTime() - self.conf.active;

		self.mysql.query('SELECT auto_id, member_id, weixin_id, groups_list, tag FROM `pre_weixin_list` WHERE groups = 1 AND groups_num > 0 AND created_date <= ? AND heartbeat_time >= ? ORDER BY auto_id ASC', [date, time], function (err, res) {

			if( err ){
				log.error( err );
				return;
			}

			var member = [];
			var useids = [];

			for (let i = 0; i < res.length; i++) {

				var groups = JSON.parse( res[i].groups_list );

				//过滤有效群
				groups = groups.filter( ele => {
					if( !self.inst.source || ele.status == self.inst.source ){
						return ele.userName;
					}
				} );

				//提取群ID
				var roomid = groups.map( ele => {
					return ele.userName;
				} );

				if( roomid.length > 0 ){
					useids.push( res[i].member_id );
					member.push( { member_id : res[i].member_id, weixin_id : res[i].weixin_id, tag : res[i].tag, roomid } );
				}

			}

			//最后一个用户加个标记
			if( useids.length ){
				member[ useids.length - 1 ].end = true;
			}

			self.members = member;
			self.updated = com.getTime();

			act.record( self.mysql, self.item, { 'quantity' : useids.length, 'member_ids' : useids }, '筛选用户' );

			log.info( '筛选用户', '在线用户 ' + res.length + ' 人，群发用户（'+ self.inst.source +'）'+ member.length + ' 人，发送状态 ' +  self.sender );
			
			func();

		});

	}

	/**
	 * 删除无效群
	 * @param integer 用户ID
	 * @param string 群ID
	 */
	delGroup( member_id, group_id ){

		var self = this;

		self.mysql.query('SELECT * FROM `pre_weixin_list` WHERE member_id = ? LIMIT 1', [member_id], function (err, res) {

			if( err ){
				log.error( err );
				return;
			}

			if( res.length == 0 || !res[0].groups_list ){
				log.info( '无效用户', res.length + ' 人' );
				return;
			}

			//当前用户
			let member = res.shift();

			//清除此群
			var groups = JSON.parse( member.groups_list );
			var newgrp = groups.filter( ele => {
				return ele.userName != group_id;
			} );
					
			//更新微信群
			self.mysql.query('UPDATE `pre_weixin_list` SET groups_num = ?, groups_list = ?, updated_time = UNIX_TIMESTAMP() WHERE member_id = ?', [ newgrp.length, JSON.stringify( newgrp ), member_id ] );
			
			log.info( '删除群组', { member_id, group_id, groups, newgrp } );

		});

	}

	/**
	 * 消息过滤器
	 * @param string 消息包ID
	 * @param object 消息数据
	 * @param object 过滤条件
	 * @param integer 返回数据，-1 全返回，1 仅返回单条
	 */
	filterMessage( pakId, msgs, where = {}, limit = -1 ) {

		//构造数据包
		var data = {

			//需要转链
			convert: 0,

			//消息包ID
			package: pakId,

			//消息列表，{ exch, msgid, msgtype, content, source }
			message: [],
		};

		for (let i = 0; i < msgs.length; i++) {

			var size = 0;
			var item = msgs[i].cmdBuf;
			let text = item.content.string;

			//撤回消息，查找之前的 rowid 并过滤掉 
			if( item.msgType == 10002 ){

				let rawid = com.match( text, /<newmsgid>(.+?)<\/newmsgid>/, 1 );

				if( rawid ){

					log.info('撤回消息', { 'rawid' : rawid, 'text' : text } );

					data.message = data.message.filter( ele => {
						return ele.rowid != rawid;
					} );

				}
				
			}

			//支持的消息类型：1 文字、3 图片、43 视频、47 表情、49 小程序
			if( [1, 3, 43, 47, 49].indexOf( item.msgType ) == -1 ){
				continue;
			}
			
			for (let w in where) {

				switch( w ){

					//谁说的活
					case 'speaker':
						size += text.indexOf( where[w] ) === 0 ? 1 : 0;
					break;

					//允许的文本
					case 'allowed':
						size += ( item.msgType != 1 || where[w].test( text ) ) ? 1 : 0;
					break;

					//其他字段
					default:
						size += ( item[w].string == where[w] ) ? 1 : 0;
					break;

				}

			};

			//群消息，过滤 xxx:\n
			if( /@chatroom$/.test( item.fromUserName.string ) ){
				text = text.replace(/^[0-9a-zA-Z_\-]{1,}:\n/, '');
			}

			//小程序，过滤 mmlive
			if( /<mmlive>/.test( text ) ){
				text = text.replace(/<mmlive>(.+?)<\/mmlive>/g, '');
			}

			//小程序，匹配 白名单
			if( /<appid>/.test( text ) && this.conf.minapp ){

				let appid = /<appid>(?:\<\!\[CDATA\[)?(.+?)(?:\]\]\>)?<\/appid>/.exec( text )[1];
				let allow = this.conf.minapp.indexOf( appid ) >= 0;
				
				log.info('小程序', { 'appid' : appid, 'allow' : allow, 'struct' : text });

				if( !allow ){
					continue;
				}
			}

			//满足所有条件
			if (size == Object.keys(where).length) {

				let exch = false;

				//不转链，文本类型，没有配置原样规则 或 文本不匹配
				if( item.msgType == 1 && ( !this.inst.origin || !this.inst.origin.test( text ) ) ){
					exch = ( act.detectTbc( text ) || act.detectUrl( text ) );
					exch && data.convert ++;
				}

				data.message.push( { msgid : item.msgId, rowid : item.newMsgId, msgtype : item.msgType, content : text, source : item.msgSource, product: null, exch });

			}

		};

		//只取一条时，直接返回消息体
		if (limit == 1) {
			return data.message.length ? data.message[0] : null;
		} else {
			return data;
		}

	}

	/**
	 * 预处理消息
	 * @param object 用户数据
	 * @param object 发群数据
	 * @param integer 延迟时间
	 */
	parseMessage( member, data, lazy_time = 0 ){

		var user = com.clone( member );
		var data = com.clone( data );
		var self = this;

		//无需转链，直接回调
		if( data.convert == 0 ){
			self.queues.push( { 'member' : user, data } );
			self.forwardMessage();
			return;
		}

		for (let i = 0; i < data.message.length; i++) {

			let comm = data.message[i];
			let exch = comm.msgtype == 1 && comm.exch;

			req.get( self.conf.convert, { 'member_id' : user.member_id, 'text' : comm.content, 'product' : 'true', 'lazy_time' : lazy_time }, (code, body) => {
				
				try {
					if( typeof body == 'string' ){
						body = JSON.parse( body );
					}
				} catch( e ){
					body = { 'status' : -code, 'body' : body, 'error' : e.toString() };
				}

				///////////////
				
				//成功转链数量
				if( body.status > 0 ){

					//文本
					comm.content = body.result;

					//原始商品信息
					comm.product = body.product;

					//转链成功，执行回调
					comm.exch && data.convert --;

					if( data.convert == 0 ){
						self.queues.push( { 'member' : user, data } );
						self.forwardMessage();
					}

				}else{

					body.err	= '转链失败';
					body.source = 'groups';
					body.lazy_time = lazy_time;

					if( exch ){
						log.info('转链失败', { 'member_id' : user.member_id, body, lazy_time, 'convert' : data.convert });
					}

					//self.mysql.query('UPDATE `pre_weixin_list` SET status = ?, status_time = ? WHERE member_id = ?', [ JSON.stringify( body ), com.getTime(), user.member_id ] );
					
					act.pushed( self.mysql, user.member_id, body );

					//写入延迟消息，更新发送状态
					if( lazy_time == 0 ){
						let time = com.getTime();
						let span = 60 * 1000 * 3;
						self.sender = time + span;
						setTimeout( () => { self.parseMessage( user, data, time ); }, span );
					}

				}

			}, ( data ) =>{

				//是口令，需要转链
				if( exch && ( user.tag & 4 ) == 0 ){
					return { 'request' : true };
				}else{
					return { 'request' : false, 'respond' : { 'status' : 1, 'result' : data.text } };
				}

			}, self.conf.options );

		}

	}

	/**
	 * 转发群消息
	 * @param boolean 用户末尾
	 */
	forwardMessage( ) {

		//暂无队列
		if( this.queues.length == 0 ){
			return;
		}

		/////////

		var self = this;
		let rkey = this.item + '_active';
		let item = this.queues.shift();
		let user = item.member;
		let data = item.data;

		if( typeof user.member_id == 'undefined' ){
			return log.info('异常队列', user);
		}

		log.info( '当前微信', { '用户ID' : user.member_id, '微信号' : user.weixin_id, '群数量' : user.roomid.length, '消息量' : data.message.length } );

		var func = ( ) => {

			log.info('消息拆包', { '用户ID' : user.member_id, '消息包' : data.package, '待发送' : data.message.length } );

			let msg = data.message.shift();
			let res = self.sendMsg( user, msg );

			self.sender = com.getTime();

			res.then(ret => {

				//本消息含商品
				if( msg.product ){
					act.collect( self.mysql, 'groups', msg.product );
				}

				//消息包已完成
				if( data.message.length == 0 ){

					log.info('群发完毕', [user.member_id, data.package]);
					
					//更新发群时间
					self.mysql.query('UPDATE `pre_weixin_list` SET groups_time = UNIX_TIMESTAMP(), groups_send = groups_send + 1 WHERE member_id = ?', [ user.member_id ] );

					//最后发群时间
					self.sider.set( rkey, com.getTime() );
					self.sider.expire( rkey, 7200 );

					//消息队列未完成
					//self.forwardMessage();

				}

			}).catch(err => {

				log.error('发群失败', [user.member_id, data.package, err]);

			}).finally( () => {

				//消息包未完成
				if( data.message.length > 0 ){
					setTimeout( () => { func(); }, 2500 );
				}

			} );

		};

		func();

	}

	/**
	 * 转发群消息
	 * @param object 用户信息
	 * @param object 单条消息
	 */
	async sendMsg( member, msg ){

		var self = this;
		var detail = msg.content;

		//文本
		if ( msg.msgtype == 1 ) {

			let fn = this.wx.NewSendMsg(member.weixin_id, member.roomid, detail, msg.source);

			fn.then(ret => {
				log.info('文本成功', [member.member_id, ret.count]);
			}).catch(err => {
				self.sendErr( member.member_id, 'NewSendMsg', err );
				//log.error('文本失败', [member.member_id, err]);
				//act.pushed( self.mysql, member.member_id, { api:'NewSendMsg', err, inst : self.inst.channel } );
			});

			return fn;

		}

		//小程序 替换UID
		if( msg.msgtype == 49 ){		
			detail = detail.replace(/userid=(\d*)/g, 'userid=' + member.member_id);
		}

		//媒体
		let size = member.roomid.length;
		for( var i = 0; i < size; i++ ){

			let chat = member.roomid[i];

			//图片
			if( msg.msgtype == 3 ){

				var fn = this.wx.UploadMsgImgXml(member.weixin_id, chat, detail);

				fn.then(ret => {
					log.info('发图成功', [member.member_id, chat, ret.msgId]);
				}).catch(err => {
					self.sendErr( member.member_id, 'UploadMsgImgXml', err, chat );
				});
			}

			//视频
			if( msg.msgtype == 43 ){

				var fn = this.wx.UploadVideoXml(member.weixin_id, chat, detail);

				fn.then(ret => {
					log.info('视频成功', [member.member_id, chat, ret.msgId]);
				}).catch(err => {
					self.sendErr( member.member_id, 'UploadVideoXml', err, chat );
				});
			}

			//表情
			if( msg.msgtype == 47 ){

				var fn = this.wx.SendEmojiXml(member.weixin_id, chat, detail);

				fn.then(ret => {
					log.info('表情成功', [member.member_id, chat, ret]);
				}).catch(err => {
					self.sendErr( member.member_id, 'SendEmojiXml', err, chat );
				});

				//多个微信群，适当延迟
				if( size > 1 && i < size - 1 ){
					await com.sleep( 1000 );
				}

			}

			//小程序
			if( msg.msgtype == 49 ){

				//发送小程序
				if( ( member.tag & 2 ) == 0 ){

					var fn = this.wx.SendAppMsgXml(member.weixin_id, chat, detail);

					fn.then(ret => {
						log.info('小程序成功', [member.member_id, chat, ret.msgId]);
					}).catch(err => {
						self.sendErr( member.member_id, 'SendAppMsgXml', err, chat );
					});

				}else{

					var fn = com.Promise( true, { 'status' : 0, 'result' : '已经忽略小程序发送' } );

				}
				
			}

		}

		return fn;

	}

	/**
	 * 转发出错了
	 * @param integer 用户ID
	 * @param string API名称
	 * @param string 错误消息
	 * @param string 微信群ID
	 */
	sendErr( member_id, api, err, chat ){
		
		//写入日志
		log.error( api, [member_id, err, chat]);

		//更新状态
		act.pushed( this.mysql, member_id, { api: api, err, chat, inst : this.inst.channel } );

		//群已经失效
		if( err == 'MM_ERR_NOTCHATROOMCONTACT' && typeof chat == 'string' ){
			this.delGroup( member_id, chat );
		}

	}

}

module.exports = Groups;