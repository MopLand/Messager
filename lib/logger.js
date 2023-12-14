
'use strict'

/**
* 日志处理类
*/

const fs = require('fs');
const os = require('os');

class Logger {

	/**
	 * 构造函数
	 * @param string 日志前缀
	 * @param boolean 写入文件
	 * @param boolean 自动切割
	 */
	constructor( file, save = true, part = false ) {
		this.file = file;
		this.save = save;
		this.part = part;
	}

	/**
	 * 追加日志
	 * @param string 日志分类
	 * @param object 消息内容
	 * @param string 消息类型
	 */
	shoot( logcat, message = '', msgtype = '' ) {

		let pwd = process.cwd();
		let date = new Date();
		let info = date.format('hh:mm:ss') + ' [ '+ logcat +' - '+ msgtype +' ] ';
		console.log( info, message );

		if( typeof message == 'object' ){
			message = JSON.stringify( message );
		}

		let text = info + message;
		let path = pwd + '/logs/' + this.file + '.log';

		this.save && fs.appendFileSync(path, text );
	}

	/**
	 * 写入日志
	 * @param string 日志分类
	 * @param object 消息内容
	 * @param string 消息类型
	 */
	write( logcat, message = '', msgtype = '' ) {

		let pwd = process.cwd();
		let date = new Date();
		let info = date.format('hh:mm:ss') + ' [ '+ logcat +' - '+ msgtype +' ] ';
		let days = date.format('yyyyMMdd');

		let splice = '';

		if ( this.part ) {

			let hours = date.getHours();

			if ( typeof this.part == 'string' ) {
				splice = this.part;
			} else if ( hours < 8 ) {
				splice = '.00';
			} else if ( hours < 10 ) {
				splice = '.0' + hours;
			} else {
				splice = '.' + hours;
			}
		}

		console.log( info, message );

		if( typeof message == 'object' ){
			message = JSON.stringify( message );
		}

		let text = info + message + os.EOL;
		let path = pwd + '/logs/' + this.file + '.' + days + splice + '.log';

		this.save && fs.appendFileSync(path, text );
	}

	/**
	 * 清理日志
	 * @param integer 多少天前
	 */
	clean( days = 7, subs = '/logs/', suffix = '.log' ){

		let pwd = process.cwd();
		let dir = pwd + subs;

		let file = fs.readdirSync( dir );
		let date = new Date();
		let time = date.getTime();
		let today = date.format('yyyyMMdd');

		//一天内秒数
		let secs = 3600 * 24 * 1000;

		//过期多少天
		let diff = days * secs;

		//文件大小限制，128 mb
		let size = 1024 * 1024 * 128;
		
		//console.log( time );

		file.filter( v => v.indexOf( suffix ) > 0 ).forEach( ele => {

			//console.log( ele );
			let node = dir + ele;

			fs.stat( node, ( err, info ) => {

				if( err ){
					return console.log( err );
				}

				if (!fs.existsSync(node)) {
					console.log( node + ' 文件已删除' );
					return true;
				}

				//创建于几天前，删除
				if( time - info.birthtimeMs >= diff ){
					fs.unlinkSync( node );
					console.log( node, info.birthtimeMs, 'DELETE' );
				}

				if ( /[0-9]{8}/.test(ele) && ele.indexOf(today) == -1 ) {
					return console.log( '每日日志文件不主动清空' );
				}
				
				//文件大于多少，清空
				if( info.size > size ){
					fs.truncateSync( node );
					console.log( node, info.size, 'REJECT' );
				}

			} );

		} );

	}

	info (msgtype, message){
		this.write('INFO', message, msgtype);
	}

	warn (msgtype, message){
		this.write('WARN', message, msgtype);
	}

	debug (msgtype, message){
		this.write('DEBUG', message, msgtype);
	}

	error (msgtype, message){
		this.write('ERROR', message, msgtype);
	}

}

module.exports = Logger;