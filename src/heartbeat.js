'use strict'

/**
 * 微信群控制器
 */

const fs = require('fs');
const com = require('../lib/common');
const Logger = require('../lib/logger');
const Account = require('./account');
const tag = com.fileName( __filename, false );
const log = new Logger( tag );

class Heartbeat {

	/**
	 * 构造函数
	 */
	constructor(conf) {

		if( conf && conf.region == 'aliyun' ){
			var wx = require('../lib/region');
		}else{
			var wx = require('../lib/weixin');
		}

		this.inst = {};
		this.conf = conf;
		this.klas = new Account(conf);
		this.wx = new wx( conf.weixin, conf.reserve, conf.special );
		this.redis = com.redis(conf.redis);
		this.mysql = com.mysql(conf.mysql, (db => { this.mysql = db; }).bind(this));
	}

	init( ){

		//每分钟预计人数
		this.count = 300;

		//每个人预计间隔
		this.space = 1000 * 60 / this.count;

		//远程服务重启时段
		this.pause = '04:40';

		//半小时以内有心跳
		this.range = com.getTime() - 60 * 30;

		//当前 PM2 实例数量
		let pwd = process.cwd();
		let txt = fs.readFileSync(pwd + '/run/heartbeat.json');
		let set = JSON.parse(txt);

		//实例ID，PM2 分流
		this.nodes = set.instances || 1;
		this.insid = process.env.NODE_APP_INSTANCE || 0;

		log.info( '应用实例', '实例数量 ' + this.nodes + '，当前实例 ' + this.insid );

		//每分钟分批心跳
		this.heartBeat();

	}

	/**
	 * 同步心跳
	 */
	heartBeat() {

		var self = this;
		var date = new Date( this.range * 1000 ).format("yyyy-M-d h:m:s");
		var span = parseInt(new Date().getTime() / 1000) - 60 * 15;

		///////////////

		log.info( '心跳范围', this.range + ' / ' + date + ' / INST ' + this.insid );

		//限制心跳时间为 15 分钟前
		var sql = 'SELECT auto_id, member_id, weixin_id, device_id, heartbeat_time FROM `pre_weixin_list` WHERE online = 1 AND heartbeat_time < ? AND auto_id % ? = ?';
		var req = [ span, this.nodes, this.insid];

		if( self.conf.region ){
			sql += ' AND region = ? ';
			req.push( self.conf.region );
		}
		
		sql += ' ORDER BY heartbeat_time ASC LIMIT ?';
		req.push( this.count );

		self.mysql.query( sql, req, function (err, res) {

			if( err ){
				log.error( err );
				return;
			}else{
				log.info( '本次心跳', res.length + ' 人，间隔 ' + self.space + ' 毫秒，上次心跳 < ' + span );
			}

			if( res.length == 0 ){
				return setTimeout( self.heartBeat.bind(self), 1000 * 60 );
			}else{
				self.handle( res );
			}

		});

	}

	/**
	 * 处理心跳
	 */
	handle( res ) {

		var self = this;

		if( res.length == 0 ){

			log.info( '心跳完成' );

			self.heartBeat();

		}else{

			//当前时间
			var date = new Date();

			//重启时段
			var stop = date.format('hh:mm') == self.pause && date.format('ss') <= 20;

			if( stop == false ){
				
				//弹出一个人
				let row = res.shift();

				//获取群消息
				let pm = self.wx.instance( row.member_id, row.device_id ).Heartbeat( row.weixin_id );

				//更新心跳范围
				self.range = row.heartbeat_time;

				pm.then(ret => {
					
					log.info( '心跳成功', [row.weixin_id, row.member_id] );

					self.update( row.auto_id, 1 );

				}).catch( err => {

					log.debug( '心跳失败', [row.weixin_id, err] );

					/*
					if ( typeof err == 'string' && /退出微信|已经失效|没有登陆/.test( err ) ) {
						self.update( row.auto_id, -1);
					}else{
						self.update( row.auto_id, 0 ); //更新为暂离状态，由 autoLogin 再次验证
					}
					*/

					//心跳全部为假离线 online = 0
					self.update( row.auto_id, 0, err );

				} ).finally( () =>{

				} );

			}else{
				log.info( '暂停心跳' );
			}

			///////////////

			setTimeout( () => { self.handle( res ); }, self.space );

		}

	}

	/**
	 * 心跳更新
	 */
	update( auto_id, online, err = '' ) {
		
		let sql = 'UPDATE `pre_weixin_list` SET heartbeat_time = UNIX_TIMESTAMP(), online = ?, status = ? WHERE auto_id = ?';
		let req = [ online, err, auto_id ];

		this.mysql.query(sql, req, function( err, ret ){
			if( err ){
				return console.error( err );
			}
		});

	}

}

module.exports = Heartbeat;