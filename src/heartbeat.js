'use strict'

/**
 * 微信群控制器
 */

const wx = require('../lib/weixin');
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
		this.inst = {};
		this.conf = conf;
		this.klas = new Account(conf);
		this.wx = new wx( conf.weixin, conf.reserve, conf.special );
		this.redis = com.redis(conf.redis);
		this.mysql = com.mysql(conf.mysql, (db => { this.mysql = db; }).bind(this));
	}

	init( ){

		//每分钟分批心跳
		this.heartBeat();

	}

	/**
	 * 同步心跳
	 */
	heartBeat2() {

		var self = this;
		var klas = new Account(this.conf);
		var span = 200;
		
		//半小时以内有心跳
		var time = () => {
			return com.getTime() - 60 * 30;
		};

		//更新用户心跳时间
		var beat = ( member_id ) => {
			self.mysql.query('UPDATE `pre_member_weixin` SET heartbeat_time = UNIX_TIMESTAMP() WHERE member_id = ?', [ member_id ] );
		}

		///////////////

		var calc = () => {

			self.mysql.query('SELECT COUNT(*) AS count FROM `pre_member_weixin` WHERE heartbeat_time >= ?', [time()], function (err, res) {

				if( err ){
					return log.error( '心跳统计', err );
				}
	
				//以十分钟一轮，每次心跳数量
				span = parseInt( res[0].count / 10 );
	
				log.info( '心跳计划', '总人数 ' + res[0].count + '，每次心跳 ' + span );
				
			});

		};

		//每半小时，计算一次心跳量
		setInterval( calc, 60 * 1000 * 30 );

		///////////////

		var send = () => {

			self.mysql.query('SELECT member_id, weixin_id, device_id FROM `pre_member_weixin` WHERE heartbeat_time >= ? ORDER BY heartbeat_time ASC LIMIT ?', [time(), span], function (err, res) {

				if( err ){
					log.error( err );
					return;
				}else{
					log.info( '本次心跳', res.length + ' 人' );
				}

				var clok = setInterval(() => {

					if( res.length == 0 ){
						clearInterval( clok );
						return log.info( '心跳完成' );
					}

					//弹出一个人
					let row = res.shift();
	
					//获取群消息
					let pm = self.wx.Heartbeat( row.weixin_id );
	
					pm.then(ret => {
	
						beat( row.member_id );
						
						log.info( '心跳成功', [row.weixin_id, row.member_id] );
	
					}).catch( err => {
	
						log.debug( '心跳失败', [row.weixin_id, err] );
	
						//autoauth -> pushlogin -> qrcodelogin
						if( err.indexOf('退出微信') > -1 ){
							
							let pa = self.wx.AutoAuth( row.weixin_id );
	
							pa.then( ret => {
								beat( row.member_id );
								log.info( '登录成功', [row.weixin_id, ret] );
							}).catch( err => {
								log.debug( '登录失败', [row.weixin_id, err] );
								klas.init( row.weixin_id, row.device_id );
							});
							
						}
	
					} );

				 }, 100);
	
			});

		};
		
		//每分钟，分批次发送心跳
		setInterval( send, 60 * 1000 );

		///////////////

		//主动心跳一次
		calc();
		send();

	}

	/**
	 * 同步心跳
	 */
	heartBeat() {

		var self = this;
		var span = 300;

		//半小时以内有心跳
		var time = com.getTime() - 60 * 30;

		///////////////

		self.mysql.query('SELECT member_id, weixin_id, device_id FROM `pre_member_weixin` WHERE heartbeat_time >= ? ORDER BY heartbeat_time ASC LIMIT ?', [time, span], function (err, res) {

			if( err ){
				log.error( err );
				return;
			}else{
				log.info( '本次心跳', res.length + ' 人' );
			}

			if( res.length == 0 ){
				return setTimeout( self.heartBeat, 1000 * 60 );
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

			//弹出一个人
			let row = res.shift();

			//获取群消息
			let pm = self.wx.Heartbeat( row.weixin_id );

			pm.then(ret => {
				
				log.info( '心跳成功', [row.weixin_id, row.member_id] );

				self.update( row.member_id );

				//todo( res );

			}).catch( err => {

				log.debug( '心跳失败', [row.weixin_id, err] );

				//autoauth -> pushlogin -> qrcodelogin
				if( err.indexOf('退出微信') > -1 ){
					
					let pa = self.wx.AutoAuth( row.weixin_id );

					pa.then( ret => {
						self.update( row.member_id );
						log.info( '登录成功', [row.weixin_id, ret] );
					}).catch( err => {
						log.debug( '登录失败', [row.weixin_id, err] );
						self.klas.init( row.weixin_id, row.device_id );
					});
					
				}

				//setTimeout( () => { todo( res ); }, 1000 );

			} ).finally( () =>{

			} );

			setTimeout( () => { self.handle( res ); }, 500 );

		}

	}

	/**
	 * 完成心跳
	 */
	update( member_id ) {
		this.mysql.query('UPDATE `pre_member_weixin` SET heartbeat_time = UNIX_TIMESTAMP() WHERE member_id = ?', [ member_id ] );
	}

}

module.exports = Heartbeat;