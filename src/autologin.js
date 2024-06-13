'use strict'

/**
 * 微信群控制器
 */

const wx = require('../lib/weixin');
const com = require('../lib/common');
const Logger = require('../lib/logger');
const Account = require('./account');
const tag = com.fileName(__filename, false);
const log = new Logger(tag);

class AutoLogin {

	/**
	 * 构造函数
	 */
	constructor(conf) {
		this.conf = conf;
		this.klas = new Account(conf);
		this.wx = new wx(conf.weixin, conf.reserve, conf.special);
		this.mysql = com.mysql(conf.mysql, (db => { this.mysql = db; }).bind(this));
	}

	init() {

		//每分钟预计人数
		this.count = 300;

		//每个人预计间隔
		this.space = 1000 * 60 / this.count;

		//远程服务重启时段
		this.pause = '04:40';

		//自动登陆
		this.autoLogin();

	}

	/**
	 * 自动登陆
	 */
	autoLogin() {

		var self = this;

		///////////////

		self.mysql.query('SELECT member_id, weixin_id, device_id, heartbeat_time FROM `pre_weixin_list` WHERE online = 0 ORDER BY heartbeat_time ASC LIMIT ?', [this.count], function (err, res) {

			if (err) {
				log.error(err);
				return;
			} else {
				log.info('自动登陆', res.length + ' 人，间隔 ' + self.space + ' 毫秒');
			}

			if (res.length == 0) {
				return setTimeout(self.autoLogin.bind(self), 60 * 1000);
			} else {
				self.handle(res);
			}

		});

	}

	/**
	 * 处理登陆
	 */
	handle(res) {

		var self = this;

		if (res.length == 0) {

			log.info('登陆完成');

			self.autoLogin();

		} else {

			//当前时间
			var date = new Date();

			//重启时段
			var stop = date.format('hh:mm') == self.pause && date.format('ss') <= 20;

			if (stop == false) {

				//弹出一个人
				let row = res.shift();

				let pa = self.wx.AutoAuth(row.weixin_id);

				pa.then(ret => {
					self.update(row.member_id, row.weixin_id);
					log.info('登录成功', [row.weixin_id, ret]);
				}).catch(err => {
					log.debug('登录失败', [row.weixin_id, err]);

					// 判断登录接口是否正常返回 错误对象，正确则下线微信号，否则下次继续处理自动登录
					// 微信账号未登陆成功，请重新获取二维码登陆
					if (typeof err == 'object' || (typeof err == 'string' && err.indexOf('重新获取二维码登陆'))) {
						self.update(row.member_id, row.weixin_id, false); // 更新本地库
					}
					// self.klas.init(row.weixin_id, row.device_id);
				}).finally(() => {

				});

			} else {
				log.info('暂停登陆');
			}

			///////////////

			setTimeout(() => { self.handle(res); }, self.space);

		}

	}

	/**
	 * 完成心跳
	 */
	update(member_id, weixin_id, online = true) {

		let set = 'online = -1';

		if (online) {
			set = 'heartbeat_time = UNIX_TIMESTAMP(), online = 1';
		}

		this.mysql.query('UPDATE `pre_weixin_list` SET ' + set + ' WHERE member_id = ? AND weixin_id = ?', [member_id, weixin_id]);
	}

}

module.exports = AutoLogin;