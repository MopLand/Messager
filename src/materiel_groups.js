'use strict'

/**
 * 微信群控制器
 */

const wx = require('../lib/weixin');
const com = require('../lib/common');
const Logger = require('../lib/logger');
const tag = com.fileName(__filename, false);
const log = new Logger(tag);

class MaterielGroups {
	/**
	 * 构造函数
	 */
	constructor(conf) {
		this.inst = {};
		this.conf = conf;
		this.wx = new wx(conf.weixin, conf.reserve, conf.special);
		this.redis = com.redis(conf.redis);
		conf.mysql.charset = 'utf8mb4';
		this.mysql = com.mysql(conf.mysql, (db => { this.mysql = db; }).bind(this));
	}

	/**
	 * 初始化程序
	 */
	init(item = 'materiel_groups') {
		let conf = this.conf[item] || {};
		let time_interval = conf.time_interval || 10; // 时间间隔 单位秒

		if (!conf.wechat || !conf.listen || (conf.listen && conf.listen.length == 0)) {
			return log.error('配置错误', { item, conf });
		}

		this.inst = conf;

		this.getTime = time_interval * 1000;
		this.getMessageList()
	}

	getMessageList() {

		var self = this;
		var wechat = this.inst.wechat; // 监听消息微信号

		var keybuf = '';
		var marker = 'materiel_groups_id'; // 最近一次消息缓存key

		//最近一次微信群消息ID
		this.redis.get(marker, (err, ret) => {
			keybuf = ret || keybuf;
		});

		setInterval(function () {

			let pm = self.wx.NewSync(wechat, keybuf, 2); // 同步消息

			pm.then(ret => {

				let create_time = self.parseMessage(ret.cmdList.list);

				log.info('读取成功', { date: (new Date()).format("yyyy-MM-dd hh:mm:ss"), wechat, create_time });

				//记录消息标记
				keybuf = ret.keyBuf.buffer;
				
				//临时存储一天
				self.redis.set(marker, keybuf);
				self.redis.expire(marker, 3600 * 14);

			}).catch(err => {
				log.info('读取错误', err);
			});
		}, self.getTime);

	}

	/**
	 * 过滤并保存消息结构
	 * @param {Array} list 
	 */
	parseMessage(list) {

		let listen = this.inst.listen; // 过滤消息微信号
		let size = list.length;

		let time = 0;
		for (let i = 0; i < size; i++) {
			let item = list[i].cmdBuf;

			if (!item || !item.msgType || !item.content.string || !item.fromUserName) {
				continue;
			}

			let from = item.fromUserName.string;
			time = item.createTime;

			if ([1, 3, 43, 47, 49].indexOf(item.msgType) < 0) {
				continue;
			}

			if (listen.indexOf(from) < 0) {
				continue;
			}

			// `new_msgid`, `from_user`, `to_user`, `msg_type`, `content`, `send_create`, `created_time`, `created_date`
			let data = [
				item.newMsgId,
				from,
				item.toUserName.string,
				item.msgType,
				item.content.string,
				item.createTime,
				com.getTime(),
				(new Date).format('yyyyMMdd')
			];

			// log.info('有效消息', data);

			this.saveMessage(item.newMsgId, data);

		}

		return time;
	}

	/**
	 * 保存消息
	 * @param {String} msgid 
	 * @param {Array} data 
	 */
	async saveMessage(msgid, data) {

		var self = this;
		await com.sleep(this.getTime / data.length)

		self.mysql.query('SELECT * FROM `pre_assets_groups` WHERE `new_msgid` = ? LIMIT 1', [msgid], (err, res) => {
			if (err || res.length > 0) {
				return;
			}

			self.mysql.query('INSERT INTO `pre_assets_groups` (`new_msgid`, `from_user`, `to_user`, `msg_type`, `content`, `send_create`, `created_time`, `created_date`) VALUES (?,?,?,?,?,?,?,?)', data, (err, res) => {
				if (err) {
					return log.error('保存失败', err);
				}

				log.info('保存成功', 1);
			})
		})
	}

}

module.exports = MaterielGroups;