'use strict'

const wx = require('../lib/weixin');
const Common = require('../lib/common');
const Logger = require('../lib/logger');
const tag = Common.fileName( __filename, false );
const log = new Logger( tag );

class Account {

    /**
     * 构造函数
     */
	constructor(conf, save = './') {

		//实例化微信
		this.wx = new wx(conf.weixin);

		//二维码位置
		this.code = save + 'qr.png';

		this.conf = conf;

	}

	/**
     * 引导扫码登录
     * @param string weixin 微信Id
     * @param string device 设备Id
     */
	init( wxid = '', device = '' ){

		var uuid = '';
		var self = this;
		var pm = this.login( wxid, device );

		pm.then( ret => {
			uuid = ret.uuid;
			log.info( '等待登录', ret );
		}).catch( err => {
			log.error('登录出错', err);
		});
		
		////////////

		var init = 0;
		var clok = setInterval(() => {

			if( uuid ){

				let pm = self.check( uuid );

				pm.then( ret =>{

					//log.info( ret );

					//扫码成功
					if (ret.notify.status == 2) {

						clearInterval( clok );

						log.info( 'NOTIFY', ret.notify );

						////////

						let pm = self.submit( ret.notify.userName );

						pm.then(ret=>{
							log.info( '提交登录', ret );
						}).catch(err=>{
							log.error( '提交失败', err );
						});
						
					}

				}).catch(err => {
					log.info( '检查状态', err );
				});

			}

			if( init >= 15 ){
				clearInterval( clok );
				Common.DelFile( self.code );
				log.info( '扫码超时', { wxid, device } );
			}else{
				init++;
			}

		}, 3000 );

	}

    /**
     * 处理用户登录（获取二维码或推送登录）
     * @param string weixin 微信Id
     * @param string device 设备Id
     */
	login( wxid = '', device = '' ) {

		var self = this;
		var pm = wxid ? this.wx.PushLoginUrl( wxid ) : this.wx.GetLoginQrCode( device );

		log.info('登录方式', wxid, wxid ? 'Push' : 'Qrcode' );

		pm.then( ret => {
			if( !wxid && ret.qrcode ){
				Common.SavePic(decodeURIComponent(ret.qrcode.buffer), self.code );
			}
		}).catch( err => {
			log.error( '登录错误', [wxid, err] );
		});

		return pm;

	}

    /**
     * 检查登录状态
     * @param string wxId 微信Id
     */
	check( uuid ) {

		var pm = this.wx.CheckLogin(uuid);

		/*
		pm.then(ret => {
			log.info(ret);
		}).catch(err => {
			log.info(err);
		});
		*/

		return pm;

		/*
		fn.then(ret => {

			log.info(ret);

			if (ret.State <= 0) {
				log.info('请完成扫码登录');
			}

		}).catch(msg => {
			log.info(msg);
		});
		*/
	}

    /**
     * 提交登录
     * @param string wxId 微信Id
     */
	submit( wxid ) {

		var pm = this.wx.ManualAuth( wxid );
		var self = this;

		//删除二维码
		pm.then( ret => {
			//Common.DelFile( self.code );
		}).catch( err => {
			//log.info( err );
		}).finally( () => {
			Common.DelFile( self.code );
		} );

		return pm;
	}

	 /**
     * 联系人
     * @param string wxId 微信Id
     * @param string room 微信群Id
     */
	contact( wxid, room ) {

		var wxid = wxid || this.conf.wechat;

		if( room ){
			var pm = this.wx.GetChatroomMemberDetail( wxid, room );
		}else{
			var pm = this.wx.InitContact( wxid, 999999999 );
		}

		pm.then( ret => {			
			log.info( '接口返回', ret );
		}).catch( err => {
			log.error( '联系人错误', [wxid, err] );
		});

		return pm;
	}

}

module.exports = Account;