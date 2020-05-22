'use strict'

const wx = require('../lib/weixin');
const cm = require('../lib/common');

class Account {

    /**
     * 构造函数
     */
	constructor(conf, save) {

		//实例化微信
		this.wx = new wx(conf.weixin);
		
		var uuid = '';
		var self = this;

		let pm = this.login( save );

		pm.then( ret => {

			uuid = ret.uuid;

			console.log( 'uuid', ret.uuid );
			console.log( 'expi', ret.expiredTime );
			console.log('等待完成扫码');

		}).catch(msg => {
			console.log(msg);
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

						let pm = self.submit( ret.notify.userName, save );

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
				console.log('扫码登录超时，请重试');
			}else{
				init++;
			}

		}, 3000 );

	}

    /**
     * 登录
     * @param string 图片存储位置
     */
	login( save ) {

		var pm = this.wx.GetLoginQrCode();

		pm.then(ret => {
			cm.SavePic(decodeURIComponent(ret.qrcode.buffer), save + 'qr.png');
		});

		return pm;

	}

    /**
     * 检查登录状态
     * @param string wxId 微信Id
     */
	check(uuid) {

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
     * @param string 图片存储位置
     */
	submit(wxid, save ) {

		var pm = this.wx.ManualAuth( wxid );

		//删除二维码
		pm.then( ret => {			
			cm.DelFile( save + 'qr.png' );
		} ).catch( err => {

		} );

		return pm;
	}

}

module.exports = Account;