'use strict'

/**
 * 公共类方法
 * Created by veryide@qq.com on 2020-05-12.
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
 *(new Date()).Format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423
 *(new Date()).Format("yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18
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
	 * @desc XML 转对象
	 * @param string data	字符串
	 * @return Promise
	 */
	static parseXml(data) {
		const parser = new xml2js.Parser({ attrkey: "ATTR", explicitRoot: false, explicitArray: false });
		return parser.parseStringPromise(data);
	}

	/**
	* @desc  生成 URL-encode 之后的请求字符串
	* @param {Object}  data	   可以是数组或包含属性的对象
	* @return {String} URL 编码后的字符串
	*/
	static buildReq(data) {
		return Object.keys(data).map(function(key) {
			return [key, data[key]].map(encodeURIComponent).join('=');
		}).join("&");
	}

	/**
	* @desc  获取文件扩展名
	* @return {String} 扩展名
	*/
	static fileExt(file){
		return file.split('.').pop();
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
			console.log(exts);

		} catch (err) {
			console.log('extend.js not found');
		}

		return conf;

	}

	/**
     * 获取当前时间
     */
	static getTime() {
		return parseInt( (new Date()).getTime() );
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

	/*
		自动生成数据库配置
		env		运行环境
		fn		回调方法
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

}

module.exports = Common;
