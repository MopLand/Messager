'use strict'

/**
 * 公共类方法
 * Created by veryide@qq.com on 2020-05-12.
 */

const fs = require('fs');
const redis = require('redis');
const xml2js = require('xml2js');

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
		return redis.createClient(conf['redis.port'], conf['redis.host'], { password: conf['redis.password'], prefix: conf['redis.prefix'] });
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
	 * @desc XML 转对象
	 * @param string data	字符串
	 * @return Promise
	 */
	static parseXml(data) {
		const parser = new xml2js.Parser({ attrkey: "ATTR", explicitRoot: false, explicitArray: false });
		return parser.parseStringPromise(data);
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
