'use strict'

/**
 * 群消息 WebSocket
 */

const ws = require('ws');
const com = require('../lib/common');
const Logger = require('../lib/logger');
const tag = com.fileName(__filename, false);
const log = new Logger(tag);

class SocketSend {

	/**
	 * 构造函数
	 */
	constructor(conf) {
		this.conf = conf;
		this.client = [];
		this.redis = com.redis(conf.redis);
	}

	async init() {

		let self = this;

		//Redis消息频道
		var channel = 'mm_socket_send';

		///////////////

		const wss = new ws.Server({ port: 8080 });

		wss.on('connection', function connection(ws) {

			self.client.push( ws );

			ws.on('error', console.error);

			ws.on('message', function message(data) {
				console.log('received: %s', data);
			});

			ws.send('ok');

		});
		
		log.info('启动服务', wss);

		///////////////

		//消息筛选条件
		var where = {};

		//订阅消息发送
		this.subscribe(channel, where);
	}

	/**
	 * 订阅消息
	 * @param string 消息频道
	 * @param object 消息过滤
	 */
	subscribe(channel, where) {

		let self = this;

		//处理 Redis 消息
		this.redis.on('message', function (channel, message) {

			try {

				log.info('收到消息', message);

				let recv = JSON.parse(message);

				//发送最新消息
				self.client.forEach( cl => {
					cl.send(message);
				} );

				log.info('转发消息', '消息包 #' + recv.lastid + ' 包含 ' + recv.message.length + ' 条消息，转发给 ' + self.client.length + ' 个客户端');

			} catch (e) {
				return log.error('消息异常', { channel, message });
			}

		});

		//订阅 Redis 频道消息
		this.redis.subscribe(channel);

	}

}

module.exports = SocketSend;