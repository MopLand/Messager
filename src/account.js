'use strict'

const wx = require('../lib/weixin');
const cm = require('../lib/common');

class Account {

    /**
     * 构造函数
     */
	constructor(conf) {
		this.wx = new wx(conf.weixin);
	}

    /**
     * 登录
     * @param string member_id 用户ID
     */
	login(member_id = '') {

		//var ret = await this.wx.GetLoginQrCode();

		//return ret;

		//return await this.wx.GetLoginQrCode();

		var pm = this.wx.GetLoginQrCode();

		pm.then(ret => {
			cm.SavePic(decodeURIComponent(ret.QrBase64), 'qr.png');
		});

		return pm;

		//return res.then();

		/*
		try{

			var ret = await this.wx.GetLoginQrCode();
		
			//	cm.SavePic( decodeURIComponent( ret.QrBase64 ), 'qr.png' );

			console.log( typeof ret );

			return ret;

		}catch( err ){

			console.log( err );
			
			return err;
		}
		*/

	}

    /**
     * 检查登录状态
     * @param string wxId 微信Id  必填True 
     * @param string appId 公众号AppId  必填True 
     */
	check(uuid) {

		var pm = this.wx.CheckLogin(uuid);

		pm.then(ret => {
			console.log(ret);
		}).catch(err => {
			console.log(err);
		});

		return pm;

		fn.then(ret => {

			console.log(ret);

			if (ret.State <= 0) {
				console.log('请完成扫码登录');
			}

		}).catch(msg => {
			console.log(msg);
		});
	}

}

module.exports = Account;