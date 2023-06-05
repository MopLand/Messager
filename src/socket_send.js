'use strict'

/**
 * 微信群控制器
 */

const fs = require('fs');
const ws = require('ws');
const wx = require('../lib/weixin');
const com = require('../lib/common');
const req = require('../lib/request');
const act = require('../lib/activity');
const Logger = require('../lib/logger');
const tag = com.fileName(__filename, false);
const log = new Logger( tag, true, true );

class SocketSend {

    /**
     * 构造函数
     */
    constructor(conf) {
        this.conf = conf;
        this.redis = com.redis(conf.redis);
    }

    async init() {

        //Redis消息频道
        var channel = 'mm_groups_send';

        ///////////////

        const wss = new ws.Server({ port: 8080 });

		wss.on('connection', function connection(ws) {

			this.socket = ws;

			ws.on('error', console.error);

			ws.on('message', function message(data) {
				console.log('received: %s', data);
			});

			ws.send('something');

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

            let recv = JSON.parse(message);
            log.info('收到消息', recv);

            //发送最新消息           
			this.socket.send(recv.roomid, recv.message, recv.forced);

        });

        //订阅 Redis 频道消息
        this.redis.subscribe(channel);

    }

}

module.exports = SocketSend;