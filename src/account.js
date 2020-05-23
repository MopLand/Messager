'use strict'

const wx = require('../lib/weixin');
const cm = require('../lib/common');

class Account {

    /**
     * 构造函数
     */
	constructor(conf, save = './') {

		//实例化微信
		this.wx = new wx(conf.weixin);

		//二维码位置
		this.code = save + 'qr.png';

		return this;

	}

	/**
     * 引导扫码登录
     * @param string wxId 微信Id
     */
	init( wxid = '' ){

		var uuid = '';
		var self = this;
		var pm = this.login( wxid );

		pm.then( ret => {

			uuid = ret.uuid;

			console.log( 'UUID', ret.uuid );
			console.log( '过期', ret.expiredTime );

			console.log('等待完成扫码 或 登录');

		});
		
		////////////

		var init = 0;
		var clok = setInterval(() => {

			if( uuid ){

				let pm = self.check( uuid );

				pm.then(ret=>{

					//扫码成功
					if (ret.notify.status == 2) {

						clearInterval( clok );

						console.log( ret.notify );

						////////

						let pm = self.submit( ret.notify.userName );

						pm.then(ret=>{
							console.log( ret );
						}).catch(err=>{
							console.log( err );
						});
						
					}

				}).catch(msg => {
					console.log(msg);
				});

			}

			if( init >= 10 ){
				clearInterval( clok );
				cm.DelFile( self.code );
				console.log('扫码登录超时，请重试');
			}else{
				init++;
			}

		}, 3000 );

	}

    /**
     * 获取登录二维码
     * @param string wxId 微信Id
     */
	login( wxid ) {

		var pm = wxid ? this.wx.PushLoginUrl( wxid ) : this.wx.GetLoginQrCode();
		var self = this;

		pm.then(ret => {
			if( !wxid && ret.qrcode ){
				cm.SavePic(decodeURIComponent(ret.qrcode.buffer), self.code );
			}
		}).catch( msg => {
			console.log( msg );
		});

		return pm;

	}

    /**
     * 检查登录状态
     * @param string wxId 微信Id
     */
	check ( uuid ) {

		var pm = this.wx.CheckLogin(uuid);

		/*
		pm.then(ret => {
			console.log(ret);
		}).catch(err => {
			console.log(err);
		});
		*/

		return pm;

		/*
		fn.then(ret => {

			console.log(ret);

			if (ret.State <= 0) {
				console.log('请完成扫码登录');
			}

		}).catch(msg => {
			console.log(msg);
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
			cm.DelFile( self.code );
		}).catch( msg => {
			console.log( msg );
		});

		return pm;
	}

}

module.exports = Account;