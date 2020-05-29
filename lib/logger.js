
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
	constructor( file, save = true ) {
		this.file = file;
		this.save = save;
	}

	write( logcat, message = '', msgtype = '' ) {

		let pwd = process.cwd();
		let date = new Date();
		let info = date.format('hh:mm:ss') + ' [ '+ logcat +' - '+ msgtype +'] ';
		let days = date.format('yyyyMMdd');

		console.log( info, message );

		if( typeof message == 'object' ){
			message = JSON.stringify( message );
		}

		let text = info + message + os.EOL;

		this.save && fs.appendFileSync(pwd+'/logs/'+ this.file + '.' + days +'.log', text );
	}

	info (msgtype, message){
		this.write('INFO ', message, msgtype);
	}

	warn (msgtype, message){
		this.write('WARN ', message, msgtype);
	}

	debug (msgtype, message){
		this.write('DEBUG', message, msgtype);
	}

	error (msgtype, message){
		this.write('ERROR', message, msgtype);
	}

}

module.exports = Logger;