'use strict'

/**
 * 公共类方法
 * Created by veryide@qq.com on 2020-09-07.
 */

const fs = require('fs');
const mysql = require('mysql');
const redis = require('redis');
const xml2js = require('xml2js');

/**
 *对Date的扩展，将 Date 转化为指定格式的String
 *月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符，
 *年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字)
 *例子：
 *(new Date()).format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423
 *(new Date()).format("yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18
 */
Date.prototype.format = function (fmt) {
    var o = {
        "M+": this.getMonth() + 1, //月份
        "d+": this.getDate(), //日
        "h+": this.getHours(), //小时
        "m+": this.getMinutes(), //分
        "s+": this.getSeconds(), //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        "S": this.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}

class Common {

    /**
     * 构造函数
     */
	constructor() {

	}

	/**
     * 创建 Redis 连接
	 * @param object 配置
     */
	static redis(conf) {
		return redis.createClient(conf.port, conf.host, { password: conf.password, prefix: conf.prefix });
	}

	/**
     * 创建 Mysql 连接
	 * @param object 配置
	 * @param function 重连回调
     */
	static mysql( conf, recb ) {

		var fn = this;
		var db = mysql.createConnection(conf);
			db.connect();

			recb && db.on('error', function(err) {
				if( err.code === 'PROTOCOL_CONNECTION_LOST' ) {
					console.log('DB_RE_CONN', err.message);
					recb && recb( fn.mysql( conf, recb ) );
				} else {
					throw err;
				}
			});

		return db;
	}

	/**
	 * @desc 权重对比
	 * @param float probability	概率 0-1
	 * @param integer length	最大值	
	 * @return boolean
	 */
	static weight(probability = 0.1, length = 100) {
		var test = parseInt(Math.random() * length) + 1;
		return test <= probability * length;
	}

	/**
	 * @desc 数组随机取值
	 * @param array 原数组
	 * @param integer 长度，默认 1	
	 * @return mixed
	 */
	static sliced(array, length = 1) {

		var raw = [].concat( array ).sort(function() {
			return (0.5-Math.random());
		});

		var ret = raw.splice( 0, length );

		if( length == 1 ){
			return ret.length ? ret[0] : null;
		}else{
			return ret;
		}

		/*
		var ret = [];
		var len = length;

		do{
			var idx = Math.floor((Math.random()*array.length));
			var old = array.splice( idx, 1 );
			ret = ret.concat( old );
			len --;
		}while( len > 0 );

		if( length == 1 ){
			return ret.length ? ret[0] : null;
		}else{
			return ret;
		}
		*/
	}

	/**
	 * @desc 延缓执行
	 * @param integer 时间（毫秒）
	 * @return void
	 */
	static sleep(delay) {
		for(var t = Date.now(); Date.now() - t <= delay;);
	}

	/**
	 * @desc 对象筛选
	 * @param string 字符串
	 * @param regexp 正则表达式
	 * @param integer 索引位置
	 * @return string
	 */
	static match(string, regexp, index = -1) {
		var test = regexp.exec( string );
		if( test ){
			if( index > -1 ){
				return typeof test[index] != 'undefined' ? test[index] : null;
			}else{
				return test;
			}			
		}else{
			return null;
		}
	}

	/**
	 * @desc 对象筛选
	 * @param object 对象
	 * @param function 筛选方法
	 * @return object
	 */
	static filter(obj, func) {
		let ret = {};
		for(let key in obj) {
			if(obj.hasOwnProperty(key) && func(obj[key], key)) {
				ret[key] = obj[key];
			}
		}
		return ret;
	}

	/**
	 * @desc 对象深拷贝
	 * @param object 对象
	 * @return object
	 */
	static clone(obj) {
		var ret = Array.isArray(obj) ? [] : {};
		for (var key in obj) {
			if (obj.hasOwnProperty(key)) {
				if (typeof obj[key] === 'object' && obj[key] !== null) {
					ret[key] = this.clone(obj[key]);   //递归复制
				} else {
					ret[key] = obj[key];
				}
			}
		}
		return ret;
	}

	/**
	 * Convert string representation of date and time to a timestamp
	 * 
	 * @param text string modification
	 * @param now date (optional) origin date
	 * 
	 * @return date or null 
	 * 
	 * note 1: Examples all have a fixed timestamp to prevent tests to fail because of variable time(zones)
	 * 
	 * example 1: strtotime('+1 day', 1129633200);
	 * returns 1: 1129719600
	 * 
	 * example 2: strtotime('+1 week 2 days 4 hours 2 seconds', 1129633200);
	 * returns 2: 1130425202
	 * 
	 * example 3: strtotime('last month', 1129633200);
	 * returns 3: 1127041200
	 * 
	 * example 4: strtotime('2009-05-04 08:30:00');
	 * returns 4: 1241418600
	 **/
	static strtotime (text, now) {
	
		var parsed, match, year, date, days, ranges, len, times, regex, i;

		if (!text) {
			return null;
		}

		// Unecessary spaces
		text = text.trim()
			.replace(/\s{2,}/g, ' ')
			.replace(/[\t\r\n]/g, '')
			.toLowerCase();

		if (text === 'now') {
			return now === null || isNaN(now) ? new Date().getTime() / 1000 | 0 : now | 0;
		}
		if (!isNaN(parsed = Date.parse(text))) {
			return parsed / 1000 | 0;
		}
		if (text === 'now') {
			return new Date().getTime() / 1000; // Return seconds, not milli-seconds
		}
		if (!isNaN(parsed = Date.parse(text))) {
			return parsed / 1000;
		}

		match = text.match(/^(\d{2,4})-(\d{2})-(\d{2})(?:\s(\d{1,2}):(\d{2})(?::\d{2})?)?(?:\.(\d+)?)?$/);
		if (match) {
			year = match[1] >= 0 && match[1] <= 69 ? +match[1] + 2000 : match[1];
			return new Date(year, parseInt(match[2], 10) - 1, match[3],
				match[4] || 0, match[5] || 0, match[6] || 0, match[7] || 0) / 1000;
		}

		date = now ? new Date(now * 1000) : new Date();
		days = {
			'sun': 0,
			'mon': 1,
			'tue': 2,
			'wed': 3,
			'thu': 4,
			'fri': 5,
			'sat': 6
		};
		ranges = {
			'yea': 'FullYear',
			'mon': 'Month',
			'day': 'Date',
			'hou': 'Hours',
			'min': 'Minutes',
			'sec': 'Seconds'
		};

		function lastNext(type, range, modifier) {
			var diff, day = days[range];

			if (typeof day !== 'undefined') {
				diff = day - date.getDay();

				if (diff === 0) {
					diff = 7 * modifier;
				}
				else if (diff > 0 && type === 'last') {
					diff -= 7;
				}
				else if (diff < 0 && type === 'next') {
					diff += 7;
				}

				date.setDate(date.getDate() + diff);
			}
		}
		function process(val) {
			var splt = val.split(' '), // Todo: Reconcile this with regex using \s, taking into account browser issues with split and regexes
				type = splt[0],
				range = splt[1].substring(0, 3),
				typeIsNumber = /\d+/.test(type),
				ago = splt[2] === 'ago',
				num = (type === 'last' ? -1 : 1) * (ago ? -1 : 1);

			if (typeIsNumber) {
				num *= parseInt(type, 10);
			}

			if (ranges.hasOwnProperty(range) && !splt[1].match(/^mon(day|\.)?$/i)) {
				return date['set' + ranges[range]](date['get' + ranges[range]]() + num);
			}
			if (range === 'wee') {
				return date.setDate(date.getDate() + (num * 7));
			}

			if (type === 'next' || type === 'last') {
				lastNext(type, range, num);
			}
			else if (!typeIsNumber) {
				return false;
			}
			return true;
		}

		times = '(years?|months?|weeks?|days?|hours?|minutes?|min|seconds?|sec' +
			'|sunday|sun\\.?|monday|mon\\.?|tuesday|tue\\.?|wednesday|wed\\.?' +
			'|thursday|thu\\.?|friday|fri\\.?|saturday|sat\\.?)';
		regex = '([+-]?\\d+\\s' + times + '|' + '(last|next)\\s' + times + ')(\\sago)?';

		match = text.match(new RegExp(regex, 'gi'));
		if (!match) {
			return false;
		}

		for (i = 0, len = match.length; i < len; i++) {
			if (!process(match[i])) {
				return false;
			}
		}

		// ECMAScript 5 only
		//if (!match.every(process))
		//    return false;

		return (date.getTime() / 1000);
	}

	/**
	 * @desc XML 转对象
	 * @param string 字符串
	 * @return Promise
	 */
	static parseXml(data) {
		const parser = new xml2js.Parser({ attrkey: "ATTR", explicitRoot: false, explicitArray: false });
		return parser.parseStringPromise(data);
	}

	/**
	* @desc  生成 URL-encode 之后的请求字符串
	* @param object  可以是数组或包含属性的对象
	* @return string 编码后的字符串
	*/
	static buildReq(data) {
		return Object.keys(data).map(function(key) {
			return [key, data[key]].map(encodeURIComponent).join('=');
		}).join("&");
	}

	/**
	* @desc  获取文件扩展名
	* @param string 原文件名
	* @return string 扩展名
	*/
	static fileExt(file){
		return file.split('.').pop();
	}

	/**
	* @desc  获取文件的名称，省略路径
	* @param string 原文件名
	* @param boolean 包含扩展名
	* @return string 文件名
	*/
	static fileName(file, ext = true){
		if( ext ){
			return file.replace(/^.*[\\\/]/, '');
		}else{
			return file.match(/([^\\\/]*?)\./)[1];
		}
	}

	/**
     * 获取配置信息
     * @param string dir 根目录
     */
	static getConf(dir) {

		var conf = require(dir + '/conf');

		try {

			var exts = require(dir + '/extend');

			for (let k in exts) {
				conf[k] = exts[k];
			}

			console.log('extend.js loaded');
			//console.log(exts);

		} catch (err) {
			console.log('extend.js not found');
		}

		return conf;

	}

	/**
     * 获取当前时间
	 * @param boolean 是否返回毫秒数
     */
	static getTime( msec = false ) {
		let time = (new Date()).getTime();
		if( msec == false ){
			time = time / 1000;
		}
		return parseInt( time );
	}

	/**
     * 获取命令行参数
     * @param string param 参数名称
     * @param string supple 默认值
     */
	static getArgv(param, supple = null) {
		var argvs = process.argv.slice(2);

		var index = argvs.findIndex(function (ele) {
			return ele == '-' + param;
		});

		if (index == -1) {
			return supple;
		} else {
			return argvs[index + 1];
		}
	}

	/**
     * 获取命令行方法
     * @param string supple 默认值
     */
	static getFunc(supple = null) {
		var argvs = process.argv.slice(2);
		if (argvs.length && argvs[0].indexOf('-') == -1) {
			return argvs[0];
		}
		return supple;
	}

	/**
     * 存储 Base64 图片
     * @param string imgData 图片数据
     * @param string fileName 文件名
     * @param function cb 回调方法
     */
	static SavePic(imgData, fileName, cb) {
		var base64Data = imgData.replace(/^data:(.*);base64,/, "");
		var dataBuffer = Buffer.from(base64Data, 'base64');
		fs.writeFile(fileName, dataBuffer, function (err) {
			if (err) {
				console.log(err);
			} else {
				console.log(fileName, 'succeed');
				cb && cb(fileName);
			}
		});
	}

	/**
     * 删除文件
     * @param string fileName 文件名
     * @param function cb 回调方法
     */
	static DelFile(fileName, cb) {

		//文件不存在
		if( !fs.existsSync( fileName ) ){
			cb && cb(fileName);
			return;
		}

		fs.unlink(fileName, function (err) {
			if (err) {
				console.log(err);
			} else {
				//console.log(fileName, 'succeed');
				cb && cb(fileName);
			}
		});
	}

	/**
     * 自动生成数据库配置
     * @param string env 运行环境
     * @param function fn 回调方法
     */
	static SeveConf(env, fn) {

		var file = '../config/config.php';
		var rule = /('database\.(.+?)') => '(.+?)'/ig;

		console.log('Set env: ' + env);

		fs.readFile(file, 'utf8', function (err, content) {

			var match = content.match(rule);

			var object = match.map((v) => {
				return v.replace(/'database\.(.+?)'/, '$1')
					.replace('=>', ':')
					.replace('username', 'user')
					.replace('dbname', 'database');
			});

			var struct = '/* AUTO-GENERATED FILE.DO NOT MODIFY */\n' +
				'module.exports = {\n' +
				'	environ: \'' + env + '\',\n' +
				'	supportBigNumbers: true,\n' +
				'	bigNumberStrings: true,\n\t' +
				object.join(',\t\n	') +
				'\n};';

			fs.writeFileSync('./config.js', struct);

			fn && fn(object);

			console.log('Successfully!!!');

		});

	}

	/**
     * 创建 Promise 对象
     * @param boolean 状态
     * @param object 数据
     */
	static Promise( isOk, data ){
		return new Promise(function (resolve, reject) {
			if ( isOk ) {
				resolve(data);
			} else {
				reject(data);
			}
		});
	}

	/**
     * @desc  创建 GIT 锁
     * @param string name 锁名称
     */
	static locked( name ) {
		let file = process.cwd() + '/'+ name +'.gitlock';
		//console.log( 'Git Locked' );
		//fs.writeFileSync( file, this.getTime() );
	}

	/**
     * @desc  删除 GIT 锁
     * @param string name 锁名称
     */
	static unlock( name ) {
		let file = process.cwd() + '/'+ name +'.gitlock';
		//console.log( 'Git Unlock' );
		//fs.existsSync( file ) && fs.unlinkSync( file );
	}

}

module.exports = Common;
