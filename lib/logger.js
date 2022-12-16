
'use strict'

/**
* 日志处理类
*/

const fs = require('fs');
const os = require('os');

class Logger {

	/**
     * 构造函数
     */
	constructor( file, save = true, sub = false ) {
		this.file = file;
		this.save = save;
		this.sub = sub;
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

		if ( this.sub ) {

			let hours = date.getHours();

			if ( hours >= 0 && hours < 13 ) {
				splice = '.01';
			} else if ( hours >= 13 && hours < 19 ) {
				splice = '.02';
			} else {
				splice = '.03';
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
	clean( days = 7 ){

		let pwd = process.cwd();
		let dir = pwd+'/logs/';

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

		file.forEach( ele => {

			if( ele.indexOf('.log') > 0 ){
				//console.log( ele );
				let node = dir + ele;

				fs.stat( node, ( err, info ) => {

					if( err ){
						return console.log( err );
					}

					if (!fs.existsSync(node)) {
						console.log( '文件已删除' );
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
			}
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