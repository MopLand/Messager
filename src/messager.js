'use strict'

const common = require('../lib/common');
const request = require('../lib/request');
const umsdk = require('umeng-push-server-sdk');
const umeng = new umsdk.client();

class Messager {

	/**
     * 构造函数
     * @param object conf 配置信息
     * @param boolean test 是否测试
     */
	constructor(conf, test) {

		this.conf = conf;

		this.setAlias(conf.aliastag);
		
		this.setKey('iphone', conf.iphone);
		this.setKey('android', conf.android);

		console.log('----------------------------');

		this.batch(test);

	}

	/**
     * 设置别名类型
     * @param string 别名标识
     */
	setAlias(type) {
		this.type = type;
	}

	/**
     * 设置各平台 Key
     * @param string 平台标识
     * @param object 应用配置
     */
	setKey(plat, app) {

		if (plat == 'iphone') {
			this.ios = new umsdk.ios.customizedcast(app.appid, app.appkey);
		}

		if (plat == 'android') {
			this.and = new umsdk.android.customizedcast(app.appid, app.appkey);
		}

	}

	/**
     * 批量推送消息
     * @param boolean test 是否测试
     */
	batch(test) {

		var self = this;
		var conf = this.conf;
		var client = common.redis(self.conf.redis);
		var copyed = common.redis(self.conf.redis);

		request.status(conf.report, 'Messager', 0, {});

		client.on('message', function (channel, message) {

			var msgs = JSON.parse(message);

			if (test) {
				console.log(msgs);
			}

			!test && msgs.forEach(msg => {

				self.sendAndroid(msg);

				self.sendIPhone(msg);

				//消息数自减，同时更新消息状态
				var ret = copyed.decrby(msg.tag, 1, function (err, len) {

					if (!err) {

						var status = { 'popid': msg.msgid, 'length': len, 'pushing_time': common.getTime() };

						copyed.set(msg.tag + '_status', JSON.stringify(status));

						//一定机率上报日志
						request.status(conf.report, 'Messager', msg.msgid, status, null, 0.01 );
					}

				});

			});

		})

		client.subscribe('dora_msg_list');

	}

	/**
     * 发送 Android 消息
     * @param object msg 消息数据
     */
	sendAndroid(msg) {

		this.and.setAlias(msg.alias, 'guodong_alias');
		this.and.setTicker(msg.ticker);
		this.and.setTitle(msg.ticker);
		this.and.setText(msg.text);

		this.and.setExtraField('msgid', msg.msgid);
		this.and.setExtraField('target', msg.after_open);
		this.and.setExtraField('content', msg.content);
		this.and.setExtraField('category', msg.category);

		this.and.setMipush(true);
		this.and.setMi_activity(this.conf.activity);

		this.and.setDisplayType('notification');
		this.and.setProductionMode();

		var ret = umeng.send(this.and);

		ret.then(function (result) {
			console.log('Android', '#' + msg.msgid, 'Alias ' + msg.alias, result ? '成功' : '失败');
		}).catch(function (reason) {
			console.log('Android', '#' + msg.msgid, reason);
		});

	}

	/**
     * 发送 iPhone 消息
     * @param object msg 消息数据
     */
	sendIPhone(msg) {

		this.ios.setAlias(msg.alias, 'guodong_alias');

		this.ios.setAlert({
			'title': msg.ticker,
			'subtitle': msg.title,
			'body': msg.text,
			'after_open': msg.after_open,
		});

		this.ios.setCustomizedField('target', msg.after_open);
		this.ios.setCustomizedField('content', msg.content);
		this.ios.setCustomizedField('category', msg.category);

		this.ios.setBadge(0);
		this.ios.setSound('default');

		var ret = umeng.send(this.ios);

		ret.then(function (result) {
			console.log('iPhone', '#' + msg.msgid, 'Alias ' + msg.alias, result ? '成功' : '失败');
		}).catch(function (reason) {
			console.log('iPhone', '#' + msg.msgid, reason);
		});

	}

}

module.exports = Messager;