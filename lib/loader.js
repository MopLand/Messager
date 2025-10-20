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
	* @param string  HTML文件名
	* @param string  输出文件名
	* @param string  CDN 域名
	*/
	init( html, dist, host ){

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

			var file = item.join('\', \'');

			if( host ){
				file = file.replace(/(\/\/)(.+?)(\/)/g, '$1'+ host +'$3' );
			}

			self.write( 'loader( [\'' + file +'\'] );', dist );
		
		} );

	}

	/**
	* 存储文件
	* @param object 参数
	* @param string  输出文件名
	*/
	write( text, dist ){

		let pwd = process.cwd();
		let tpl = fs.readFileSync( './tpl/loader.js' );
		let txt = tpl.toString().replace('/**PLACEHOLDER**/', text );
		
		txt = this.minify( txt );

		fs.writeFile( dist, txt, () => {
			console.log( dist + ' succeed!' );
		} );

	}
	
	/**
	* 压缩文件
	* @param string  文本内容
	*/
	minify( text ){
	
		text = text.replace( /^[\s]*\/\/.*/gm, '' );
		text = text.replace( /([\;\(\)\{\}][ \t]*)\/\/.*/gm, '\\1' );
		text = text.replace( /^[\s]*\/\/.*/gm, '' );
		text = text.replace( /([\r\n\t\f])/gm, '' );
		text = text.replace( /[\s]{2,}/gm, '' );
		text = text.replace( /\/\*([\S\s]*?)\*\//gm, '' );
	
		return text;
	}

}

module.exports = Loader;
