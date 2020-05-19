'use strict'

const wx = require('../lib/weixin');
const cm = require('../lib/common');

class Account {

    /**
     * 构造函数
     */
	constructor(conf) {

		//实例化微信
		this.wx = new wx(conf.weixin);
		
		var uuid = '';
		var self = this;

		let pm = this.login();

		pm.then( ret => {

			uuid = ret.uuid;

			console.log( 'uuid', ret.uuid );
			console.log( 'expi', ret.expiredTime );
			console.log('等待完成扫码');

		} );

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
				console.log('扫码登录超时，请重试');
			}else{
				init++;
			}

		}, 3000 );

	}

    /**
     * 登录
     * @param string member_id 用户ID
     */
	login(member_id = '') {

		var pm = this.wx.GetLoginQrCode();

		pm.then(ret => {
			cm.SavePic(decodeURIComponent(ret.qrcode.buffer), 'qr.png');
		});

		return pm;

	}

    /**
     * 提交登录
     * @param string wxId 微信Id
     */
	submit(wxid) {
		var pm = this.wx.ManualAuth( wxid );
		return pm;
	}

    /**
     * 检查登录状态
     * @param string wxId 微信Id  必填True 
     * @param string appId 公众号AppId  必填True 
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

}

module.exports = Account;