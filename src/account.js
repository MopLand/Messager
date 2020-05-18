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

			uuid = ret.Uuid;

			console.log( 'uuid', ret.Uuid );
			console.log( 'expi', ret.ExpiredTime );
		} );

		var clok = setInterval(() => {

			if( uuid ){

				let pm = self.check( uuid );

				pm.then(ret=>{

					if (ret.State <= 0) {
						//console.log('请完成扫码登录');
					}else{
						clearInterval( clok );
						console.log( ret );
					}

				}).catch(msg => {
					console.log(msg);
				});

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
			cm.SavePic(decodeURIComponent(ret.QrBase64), 'qr.png');
		});

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