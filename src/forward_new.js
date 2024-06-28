'use strict'

const com = require('../lib/common');
const Logger = require('../lib/logger');
const MomentSend = require('./moment_send');
const GroupsSend = require('./groups_send');

const tag = com.fileName(__filename, false);
const log = new Logger(tag);


class ForwardNew {

	/**
	 * 构造函数
	 */
	constructor(conf) {
		this.inst = {};
		this.conf = conf;
		this.redis = com.redis(conf.redis);
		this.publish = com.redis(conf.redis);
		this.mysql = com.mysql(conf.mysql, (db => { this.mysql = db; }).bind(this));

		// 订阅锁
		//this.locked = 0;
	}

	init() {
		this.moment = new MomentSend(this.conf, log);
		this.groups = new GroupsSend(this.conf, log);

		//订阅消息发送
		this.subscribe('mm_forward_new');
	}

	/**
	 * 订阅消息
	 * @param {String} channel 订阅通道
	 */
	subscribe(channel) {

		let self = this;
		let wait = 1; // 等待时间

		//处理 Redis 消息
		this.publish.on('message', function (channel, msg) {

			// 正在读取消息，锁还未失效
			/*
			if (self.locked && self.locked >= com.getTime() - wait) {
				log.info('读消息锁', self.locked);
				return;
			} else {
				self.locked = com.getTime();
				log.info('拉取方式', { channel, msg });
			}
			*/

			try {

				let message = JSON.parse(msg);

				log.info('解析成功', { channel, message });

				self.getMember( message );

			} catch (e) {
				return log.error('消息错误', { channel, msg, err : e.toString() });
			}
			
		});

		//订阅消息
		this.publish.subscribe(channel);

	}

	////////////// 处理消息 ////////////

	/**
	 * 获取用户信息
	 */
	getMember( msg ) {

		var self = this;

		//昨天时间
		//var last = com.strtotime('-1 day');
		//var date = new Date(last * 1000).format('yyyyMMdd');

		let sql = 'SELECT w.auto_id, w.member_id, w.weixin_id, w.device_id, w.groups_list, w.moment, w.groups, w.tag, m.`invite_code` \
					FROM `pre_weixin_list` AS w LEFT JOIN `pre_member_list` AS m ON w.`member_id` = m.`member_id` WHERE w.online = 1';
		let req = [];

		if ( msg.member ) {
			sql += ' AND w.member_id = ? ';
			req.push( msg.member );
		}

		if ( msg.weixin ) {
			sql += ' AND w.weixin_id IN (?) ';
			req.push( msg.weixin );
		}

		if ( msg.type == 'moment' ) {
		//	sql += ' AND w.moment = 1';
		}

		if( self.conf.region ){
			sql += ' AND w.region = ? ';
			req.push( self.conf.region );
		}

		if ( msg.type == 'groups' ) {
			sql += ' AND w.groups_num > 0';
		}

		self.mysql.query(sql, req, function (err, res) {

			if ( err || res.length == 0 ){
				return log.error('用户错误', [err, res]);
			}

			if ( msg.type == 'moment' ) {
				self.sendMomentMessage(res, msg.object);
				return log.info('发送发圈', [res, msg.object]);
			}

			if ( msg.type == 'groups' ) {

				//过滤用户打开的群
				let user = self.filterMemberGroups(res, msg.platform, msg.roomids);

				if (user.length == 0) {
					return log.info('未找到群', [res, msg]);
				}

				//发送微信群消息源消息
				self.sendGroupsMessage(msg.msgid, user, msg.object);
				
				return log.info('发送发群', [user, msg]);
			}

		})

	}

	//////////// 发送朋友圈 ////////////

	/**
	 * 发送朋友圈消息
	 * @param {Object} user 用户信息
	 * @param {Object} data 发圈信息
	 */
	sendMomentMessage(user, data) {

		this.filterMementMessage(data, user[0].weixin_id, (res) => {

			if (!res) {
				return log.error('发圈错误', { user, data });
			}

			//预处理评论，再转发朋友圈（product=false 不解析商品，提高效率）
			for (let i = 0; i < user.length; i++) {
				this.moment.parseComment(user[i], res, i, 0, 'false');
			}

		})
	}

	/**
	 * 过滤朋友圈消息格式
	 * @param {Object} msg 朋友圈消息
	 * @param {String} userName 微信ID
	 * @param {Function} func 回调方法
	 */
	async filterMementMessage(msg, userName, func) {

		let post = {
			id: 'forward_' + userName,
			userName: userName,
			objectDesc: { string: msg.moment },
			commentUserList: msg.comment
		}

		return func(this.moment.parseMoment(post));
	}

	//////////// 发送群消息 ////////////

	/**
	 * 发送群消息
	 * @param {String} msgid 消息ID
	 * @param {Object} user 用户列表
	 * @param {Object} data 消息数据
	 */
	sendGroupsMessage(msgid, user, data) {

		//获取用户副本，限定每分钟发送量，并计算每人所需间隔时间
		var self = this;
		var size = user.length;
		var mins = size / 500;
		var span = (mins * 60 * 1000) / size;

		data = self.groups.filterMessage( '', msgid, data );

		var func = (i) => {

			//预处理消息（product=false 不解析商品，提高效率）
			self.groups.parseMessage(user[i], data, 0, 'false');

			//下一下用户
			if (i < size - 1) {
				setTimeout(() => { func(i + 1); }, span);
			}

		}

		//开始执行
		func(0);

	}

	/**
	 * 过滤用户打开的群
	 * @param {Object} res 用户列表
	 * @param {String} platform 平台名称
	 * @param {String} roomids 源群ID
	 */
	filterMemberGroups(res, platform, roomids) {

		var member = [];

		for (let i = 0; i < res.length; i++) {

			if (!res[i].groups_list) {
				continue;
			}

			let groups = JSON.parse(res[i].groups_list);

			//过滤包含消息源群的有效群
			let rooms = groups.filter(ele => {

				let opened = ele.switch == undefined || ele.switch == 1 ? true : false;
				let minapp = true;
				let anchor = true;

				//是否在选中的群里面，pre_weixin_list.roomids
				let isroom = roomids ? (roomids.indexOf(ele.userName) > -1) : true;

				if ( opened && isroom && (minapp || anchor) ) {
					ele.minapp = minapp; // 小程序 (针对拼多多)
					ele.anchor = anchor; // 链接 (针对拼多多)
					return ele;
				}

			}).map(ele => {
				return {
					roomid: ele.userName,
					minapp: ele.minapp,
					anchor: ele.anchor,
				};
			});

			if (rooms.length > 0) {
				member.push({ member_id: res[i].member_id, weixin_id: res[i].weixin_id, device_id: res[i].device_id, tag: res[i].tag, rooms });
			}
		}

		log.info('筛选用户', '符合用户 ' + member.length);

		return member;
	}

}

module.exports = ForwardNew;