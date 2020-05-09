const push = require('umeng-push-server-sdk');
const conf = require('./conf');
const umeng = new push.client();

const redis = require('redis');
const client = redis.createClient(conf['redis.port'], conf['redis.host'], { password: conf['redis.password'], prefix: conf['redis.prefix'] });
const copyed = redis.createClient(conf['redis.port'], conf['redis.host'], { password: conf['redis.password'], prefix: conf['redis.prefix'] });

var Push = {

	ios: null,
	and: null,
	type: null,

	setKey: function (plat, appid, appkey) {

		if (plat == 'iphone') {
			Push.ios = new push.ios.customizedcast(appid, appkey);
		}

		if (plat == 'android') {
			Push.and = new push.android.customizedcast(appid, appkey);
		}

	},

	setAliasType: function (type) {
		Push.type = type;
	},

	sendAndroid: function (msg) {

		Push.and.setAlias(msg.alias, 'guodong_alias');
		Push.and.setTicker(msg.ticker);
		Push.and.setTitle(msg.ticker);
		Push.and.setText(msg.text);

		Push.and.setExtraField('target', msg.after_open);
		Push.and.setExtraField('content', msg.content);
		Push.and.setExtraField('category', msg.category);

		Push.and.setMipush(true);
		//Push.and.setMi_activity('com.guodongbaohe.app.activity.MipushTestActivity');

		Push.and.setDisplayType('notification');
		Push.and.setProductionMode();

		var ret = umeng.send(Push.and);

		ret.then(function (result) {
			console.log('Android', '#' + msg.msgid, 'Alias ' + msg.alias, result ? '成功' : '失败');
		}).catch(function (reason) {
			console.log('Android', '#' + msg.msgid, reason);
		});

	},

	sendIPhone: function (msg) {

		Push.ios.setAlias(msg.alias, 'guodong_alias');

		Push.ios.setAlert({
			'title': msg.ticker,
			'subtitle': msg.title,
			'body': msg.text,
			'after_open': msg.after_open,
		});

		Push.ios.setCustomizedField('target', msg.after_open);
		Push.ios.setCustomizedField('content', msg.content);
		Push.ios.setCustomizedField('category', msg.category);

		Push.ios.setBadge(0);
		Push.ios.setSound('default');

		var ret = umeng.send(Push.ios);

		ret.then(function (result) {
			console.log('iPhone', '#' + msg.msgid, 'Alias ' + msg.alias, result ? '成功' : '失败');
		}).catch(function (reason) {
			console.log('iPhone', '#' + msg.msgid, reason);
		});

	},

	send: function () {

		client.on('message', function (channel, message) {

			var msgs = JSON.parse(message);

			msgs.forEach(msg => {

				Push.sendAndroid(msg);

				Push.sendIPhone(msg);

				//消息数自减，同时更新消息状态
				var ret = copyed.decrby(msg.tag, 1, function (err, len) {

					//消息长度
					console.log('decrby', err, msg.tag, len);

					if (!err) {

						var status = { 'popid': msg.msgid, 'length': len, 'pushing_time': (new Date).getTime() / 1000 };
						status = JSON.stringify(status);

						copyed.set(msg.tag + '_status', status);
					}

				});

			});

		})

		client.subscribe('dora_msg_list');

	}

}

Push.setAliasType(conf.aliastype);

Push.setKey('iphone', conf.iphone[0], conf.iphone[1]);
Push.setKey('android', conf.android[0], conf.android[1]);

Push.send();
