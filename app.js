const push = require('umeng-push-server-sdk');
const conf = require('./conf');
const umeng = new push.client();

const redis = require('redis');
const client = redis.createClient(conf['redis.port'], conf['redis.host'], { password: conf['redis.password'] });

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
			console.log('set DEBUG=* & node app.js');
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
			console.log(msg.msgid, 'iPhone 成功');
		}).catch(function (reason) {
			console.log(msg.msgid, 'iPhone 失败');
		});

	},

	send: function () {

		client.on('message', function (channel, message) {
			//console.log(channel, message)    // test channel-message:"channel message test"
			var msgs = JSON.parse(message);

			msgs.forEach(msg => {
				Push.sendAndroid(msg);
				Push.sendIPhone(msg);
			});

		})

		client.subscribe('dora_msg_list');

	}

}

//var p = new Push({ 'android': { 'appkey': '123', 'sss': '1111' }, 'iphone': { 'appkey': '123', 'sss': '1111' } });

Push.setAliasType(conf.aliastype);

Push.setKey('iphone', conf.iphone[0], conf.iphone[1]);

Push.setKey('android', conf.android[0], conf.android[1]);

Push.send();
