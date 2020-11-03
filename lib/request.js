'use strict'

/**
* 网络请求类
*/

const Common = require('../lib/common');
const Logger = require('../lib/logger');
const request = require('request');
const tag = Common.fileName( __filename, false );
const log = new Logger( tag );

const http = require("http");
const pool = {maxSockets: 2048};
const agent = new http.Agent({
    keepAlive: true,
	maxSockets: 2048
});

/*
const fetch = request.defaults({
	forever: true,
	timeout: 20000,
	encoding: null
});
*/

class Request {

	/**
     * GET 请求方法
     * @param string 请求地址
     * @param array 请求参数
     * @param function 回调方法
     * @param function 拦截方法
     */
	static get(url, data = {}, cb, blocker = null ) {

		//console.log(url, data);

		if( blocker ){
			let ret = blocker( data );
			//console.log( 'blocker', ret, data);
			if( ret.request == false ){
				cb( 200, ret.respond );
				return;
			}
		}

		request({
			timeout: 1000 * 15,
			method: 'GET',
			forever: true,
			//agent: agent,
			pool: pool,
			url: url,
			qs: data
		}, function (error, response, body) {

			if (error) {
				log.error('GET', {url, error} );
			} else {
				cb && cb(response.statusCode, body);
			}
			
		});

	}

	/**
     * PUT 请求方法
     * @param string 请求地址
     * @param array 请求参数
     * @param function 回调方法
     * @param function 拦截方法
     */
	static put(url, data = {}, cb, blocker = null ) {

		//console.log(url, data);

		if( blocker ){
			let ret = blocker( data );
			if( ret.request == false ){
				cb( 200, ret.respond );
				return;
			}
		}

		request({
			timeout: 1000 * 15,
			forever: true,
			//agent: false,
			pool: pool,
			method: 'PUT',
			url: url,
			form: data
		}, function (error, response, body) {

			if (error) {
				log.error('PUT', {url, error} );
			} else {
				cb && cb(response.statusCode, body);
			}
			
		});

	}

	/**
     * POST 请求方法
     * @param string 请求地址
     * @param array 请求参数
     * @param function 回调方法
     * @param function 拦截方法
     */
	static post(url, data = {}, cb, blocker = null) {

		//console.log( JSON.stringify( data ) );

		if( blocker ){
			let ret = blocker( data );
			if( ret.request == false ){
				cb( 200, ret.respond );
				return;
			}
		}

		request({
			timeout: 1000 * 15,
			forever: true,
			pool: pool,
			//agent: agent,
			method: 'POST',
			url: url,
			body: JSON.stringify( data ),
		}, function (error, response, body) {

			if (error) {
				log.error('POST', {url, error} );
			} else {
				cb && cb(response.statusCode, body);
			}

		});

	}

	/**
     * 日志请求上报
     * @param string url 请求的地址
     * @param string appid 	服务标识
     * @param string status 状态信息
     * @param array message 消息内容
     * @param integer chance 发送机率
     */
	static status(url, appid, status, message = {}, cb, chance = 1 ) {

		Common.weight( chance ) && request({
			timeout: 1000 * 15,
			method: 'GET',
			url: url,
			qs: {
				appid, status, message: JSON.stringify(message)
			}
		}, function (error, response, body) {
			cb && cb(response.statusCode, body);
		});

	}

}

module.exports = Request;