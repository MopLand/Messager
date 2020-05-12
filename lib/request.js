/**
 * ApiAction 接口请求方法
 */

const request = require('request');
 
class Request{
	
	/**
     * requestCurl curl请求方法
     * @param string $url 请求的地址
     * @param string $type POST/GET/post/get
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
				cb && cb( body );
			}else{
				console.log( body );
			}
			console.log( '-------------------------' );
		});

    }
	
	/**
     * requestCurl curl请求方法
     * @param string $url 请求的地址
     * @param string $type POST/GET/post/get
     * @param array $data 要传输的数据
     */
    static post( url, data = {}, cb ) {

		//console.log( JSON.stringify( data ) );

		request({
			timeout:1000 * 30,
			method:'POST',
			url:url,
			json:true,
			form:JSON.stringify( data ),
		},function (error, response, body) {

			//console.log( body );

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

}

module.exports = Request;