/**
 * ApiAction 接口请求方法
 */

const request = require('request');
const rp = require('request-promise');
 
class Request{
	
	/**
     * GET 请求方法
     * @param string $url 请求的地址
     * @param array $data 要传输的数据
     */
    static async get( url, data = {} ) {

		//console.log( url, data );

		return request({
			timeout:1000 * 30,
			method:'GET',
			url:url,
			qs:data
		});

    }
	
	/**
     * POST 请求方法
     * @param string $url 请求的地址
     * @param array $data 要传输的数据
     */
    static async post( url, data = {}, cb = null ) {

		/*
		return await request( {
			timeout:1000 * 30,
			method:'POST',
			url:url,
			form:data
		}, function (err, response, body) {
			if (err) {
				//handleError({ error: err, response: response, ... });
				return err;
			} else if (!(/^2/.test('' + response.statusCode))) { // Status Codes other than 2xx
				//handleError({ error: body, response: response, ... });
				return err;
			} else {
				//process(body);
				
				var text = body.replace(/:([0-9]{15,}),/g, ':"$1",');
				var	body = JSON.parse( text );
				return body;
			}
		});
		*/

		try{

			var body = await rp({
				timeout:1000 * 30,
				method:'POST',
				url:url,
				form:data
			});

			if( typeof body == 'string' ){
				var text = body.replace(/:([0-9]{15,}),/g, ':"$1",');
				var	body = JSON.parse( text );
			}

			//console.log( body );

			return body;

		}catch( err ){

			if( typeof err == 'string' ){
				var	err = JSON.parse( err );
			}

			return err;

		}

		/*
		return await request({
			timeout:1000 * 30,
			method:'POST',
			url:url,
			//json:true,
			//form:JSON.stringify( data ),
			form:data,
		},function (error, response, body) {

			//console.log( body );

			if( typeof body == 'string' ){
				var text = body.replace(/:([0-9]{15,}),/g, ':"$1",');
				var	body = JSON.parse( text );
			}

			if( error ){
				console.log( error );
			}else{
				cb && cb( response.statusCode, body );
			}

			console.log( '-------------------------' );

		});
		*/
		
	}

	/**
     * requestCurl curl请求方法
     * @param string url 请求的地址
     * @param string appid 	服务标识
     * @param string status 状态信息
     * @param array message 消息内容
     */
    static status( url, appid, status, message = {}, cb ) {

		request({
			timeout:1000 * 30,
			method:'GET',
			url:url,
			qs:{
				appid, status, message : JSON.stringify( message )
			}
		},function (error, response, body) {
			cb && cb( response.statusCode, body );
		});

    }

}

module.exports = Request;