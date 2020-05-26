'use strict'

/**
 * 营销活动类
 * Created by veryide@qq.com on 2020-05-12.
 */
 
const fs = require('fs');

class Loader {

	/**
     * 构造函数
     */
	constructor() {

	}

	/**
	* @desc  提取资源文件
	* @param {String}  HTML文件名
	* @param {String}  输出文件名
	*/
	init( html, dist ){

		var self = this;
		
		fs.readFile( html, ( err, data ) => {

			if( err ){
				console.log( err );
				return;
			}
		
			var text = data.toString();
			var rule = /(link|script)([^>]*?)(href|src)=(.+?\.(js|css))/g;
			var list = text.match( rule );
			var item = [], attr = [];
		
			for( var i = 0; i < list.length; i++ ){
				rule.lastIndex = 0;
				attr = rule.exec( list[i] );				
				item.push( attr[4] );
			}

			self.write( 'loader( [\'' + item.join('\', \'') +'\'] );', dist );
		
		} );

	}

	/**
     * 存储文件
     * @param object 参数
	* @param string  输出文件名
     */
	write( text, dist ){

		var tpl = fs.readFileSync( './tpl/loader.js' );
		var txt = tpl.toString().replace('/**PLACEHOLDER**/', text );

		fs.writeFile( dist, txt, () => {
	
		} );

	}

}

module.exports = Loader;
