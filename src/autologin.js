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

		self.mysql.query('SELECT auto_id, member_id, weixin_id, device_id, heartbeat_time FROM `pre_weixin_list` WHERE online = 0 ORDER BY heartbeat_time ASC LIMIT ?', [this.count], function (err, res) {

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

				let pa = self.wx.instance( row.auto_id ).AutoAuth(row.weixin_id);

				pa.then(ret => {

					self.update( row.auto_id, 1 );
					
					log.info('登录成功', [row.weixin_id, ret]);

				}).catch(err => {

					log.debug('登录失败', [row.weixin_id, err]);

					// 判断登录接口是否正常返回 错误对象，正确则下线微信号，否则下次继续处理自动登录
					// 微信账号未登陆成功，请重新获取二维码登陆
					//if (typeof err == 'object' || (typeof err == 'string' && err.indexOf('重新获取二维码登陆'))) {

					//服务报错
					if ( typeof err == 'string' && /二维码登陆|已经失效|微信账号|重新登录|账号安全|退出微信|退出登录|稍后再试/.test( err ) ) {
						self.update( row.auto_id, -1, err );
					}

					//微信报错
					/*
					if ( typeof err.string == 'string' && /重新登录|账号安全|退出微信|退出登录|稍后再试/.test( err.string ) ) {
						self.update( row.auto_id, -1, /<!\[CDATA\[(.+?)\]\]>/.exec( err.string )[1] || err.string );
					}
					*/

					//超过两个小时未心跳
					if ( row.heartbeat_time && (date.getTime() - row.heartbeat_time) > 60 * 60 * 1000 * 2 ) {
						self.update( row.auto_id, -1, err );
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
	 * 心跳更新
	 */
	update( auto_id, online, err = '' ) {

		let sql = 'UPDATE `pre_weixin_list` SET heartbeat_time = UNIX_TIMESTAMP(), online = ?, status = ? WHERE auto_id = ?';
		let req = [ online, err, auto_id ];

		this.mysql.query(sql, req, function( err, ret ){
			if( err ){
				return console.error( err );
			}
		});

	}

}

module.exports = AutoLogin;