/**
 * ApiAction 接口请求方法
 */

const request = require('request');
 
class Request{
	
	/**
     * GET 请求方法
     * @param string $url 请求的地址
     * @param array $data 要传输的数据
     */
    static get( url, data = {}, cb ) {

		console.log( url, data );

		request({
			timeout:1000 * 30,
			method:'GET',
			url:url,
			qs:data
		},function (error, response, body) {
			if (!error && response.statusCode == 200) {
				//cb && cb( body );
			}else{
				//console.log( body );
			}			
			cb && cb( response.statusCode, body );
			console.log( '-------------------------' );
		});

    }
	
	/**
     * POST 请求方法
     * @param string $url 请求的地址
     * @param array $data 要传输的数据
     */
    static post( url, data = {}, cb ) {

		//console.log( JSON.stringify( data ) );

		request({
			timeout:1000 * 30,
			method:'POST',
			url:url,
			//json:true,
			//form:JSON.stringify( data ),
			form:data,
		},function (error, response, body) {

			//console.log( body );

			var text = body.replace(/:([0-9]{15,}),/g, ':"$1",');
			var	body = JSON.parse( text );

			//console.log( data );

			if (!error && response.statusCode == 200) {
				//console.log( url, body );
				//cb && cb( response.statusCode, body );
			}else{
				//console.log( body );
				//cb && cb( response.statusCode, body );
			}
			
			cb && cb( response.statusCode, body );

			console.log( '-------------------------' );

		});
		
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