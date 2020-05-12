/**
 * Created by veryide@qq.com on 2020-05-12.
 * 系统功能模块实现
 */

var fs = require('fs');

var System = {

	/**
     * 获取配置信息
     * @param string dir 根目录
     */
	getConf : function( dir ){

		var conf = require( dir + '/conf');

		try {

			var exts = require( dir + '/extend');
			for (k in exts) {
				conf[k] = exts[k];
			}

			console.log('Loaded module extend.js');
			console.log(exts);

		} catch (error) {

			console.log('Not found extend.js');
		}

		return conf;

	},

	/**
     * 获取命令行参数
     * @param string param 参数名称
     * @param string supple 默认值
     */
	getArgv : function( param, supple = null ){
		var argvs = process.argv.slice(2);

		var index = argvs.findIndex( function( ele ){
			return ele == '-' + param;
		} );

		if( index == -1 ){
			return supple;
		}else{
			return argvs[ index + 1 ];
		}
	},

	/**
     * 存储 Base64 图片
     * @param string imgData 图片数据
     * @param string fileName 文件名
     * @param function cb 回调方法
     */
	SavePic : function( imgData, fileName, cb ){
		var base64Data = imgData.replace(/^data:(.*);base64,/, "");
		var dataBuffer = Buffer.from(base64Data, 'base64');
		fs.writeFile( fileName, dataBuffer, function(err) {
			if(err){
				console.log(err);
			}else{
				console.log( fileName, 'succeed' );
				cb && cb( fileName );
			}
		});
	},

	/*
		自动生成数据库配置
		env		运行环境
		fn		回调方法
	*/
	Config : function( env, fn ){

		var file = '../config/config.php';
		var rule = /('database\.(.+?)') => '(.+?)'/ig;
		
		console.log( 'Set env: ' + env );

		fs.readFile(file, 'utf8', function (err, content) {

			var match = content.match( rule );

			var object = match.map( (v) =>{
				return v.replace(/'database\.(.+?)'/,'$1')
				.replace('=>',':')
				.replace('username','user')
				.replace('dbname','database');
			} );

			var struct = '/* AUTO-GENERATED FILE.DO NOT MODIFY */\n' +
				'module.exports = {\n' +
				'	environ: \''+ env +'\',\n' +
				'	supportBigNumbers: true,\n' +
				'	bigNumberStrings: true,\n\t' +
				object.join(',\t\n	') + 
				'\n};';

			fs.writeFileSync( './config.js', struct );

			fn && fn( object );

			console.log( 'Successfully!!!' );

		});

	}

}

module.exports = System;
