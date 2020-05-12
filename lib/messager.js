'use strict'

const redis = require('redis');
const umsdk = require('umeng-push-server-sdk');
const umeng = new umsdk.client();

class Messager{

	/**
     * 设置各平台 Key
     * @param string plat 平台标识
     * @param string appid APPID
     * @param string appkey 密钥
     */
	setKey (plat, appid, appkey) {

		if (plat == 'iphone') {
			this.ios = new umsdk.ios.customizedcast(appid, appkey);
		}

		if (plat == 'android') {
			this.and = new umsdk.android.customizedcast(appid, appkey);
		}

	}

	/**
     * 设置别名类型
     * @param string type 别名标识
     */
	setAliasType (type) {
		this.type = type;
	}

	/**
     * 发送 Android 消息
     * @param object msg 消息数据
     */
	sendAndroid (msg) {

		this.and.setAlias(msg.alias, 'guodong_alias');
		this.and.setTicker(msg.ticker);
		this.and.setTitle(msg.ticker);
		this.and.setText(msg.text);

		this.and.setExtraField('target', msg.after_open);
		this.and.setExtraField('content', msg.content);
		this.and.setExtraField('category', msg.category);

		this.and.setMipush(true);
		this.and.setMi_activity( this.conf.activity );

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
	sendIPhone (msg) {

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

	/**
     * 创建 Redis 连接
     */
	redis(){
		return redis.createClient(this.conf['redis.port'], this.conf['redis.host'], { password: this.conf['redis.password'], prefix: this.conf['redis.prefix'] });
	}

	/**
     * 批量推送消息
     * @param boolean test 是否测试
     */
	batch( test ){

		var self = this;
		var client = this.redis();
		var copyed = this.redis();

		client.on('message', function (channel, message) {

			var msgs = JSON.parse(message);

			if( test ){
				console.log( msgs );
			}

			!test && msgs.forEach(msg => {

				self.sendAndroid( msg );

				self.sendIPhone( msg );

				//消息数自减，同时更新消息状态
				var ret = copyed.decrby(msg.tag, 1, function (err, len) {

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

	/**
     * 构造函数
     * @param object conf 配置信息
     * @param boolean test 是否测试
     */
	constructor ( conf, test ) {

		this.conf = conf;
		
		this.setAliasType( conf.aliastype );

		console.log( '----------------------------' );

		this.setKey('iphone', conf.iphone[0], conf.iphone[1]);
		this.setKey('android', conf.android[0], conf.android[1]);

		this.batch( test );

	}

}

module.exports = Messager;