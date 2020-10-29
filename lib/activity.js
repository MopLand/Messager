'use strict'

/**
 * 营销活动类
 * Created by veryide@qq.com on 2020-08-04.
 */

class Activity {

    /**
     * 构造函数
     */
	constructor() {

	}

	/**
	* @desc  检测是否包含口令
	* @param {String}  text
	* @return {Boolean}
	*/
	static detectTbc(text) {
		//return /(?<tag>[¥|￥|\$|£|₤|€|₴|¢|₰|₳|@|《|》|\(|\)|\/])([a-zA-Z0-9]{11})(?&tag)/.test( text );
		return /(¥|￥|\$|£|₤|€|₴|¢|₰|₳|₪|₲|₵|@|《|》|\(|\)|\/)([a-zA-Z0-9]{11})(¥|￥|\$|£|₤|€|₴|¢|₰|₳|₪|₲|₵|@|《|》|\(|\)|\/)/.test( text );
	}

	/**
	* @desc  提取淘口令主体
	* @param {String}  text
	* @return {String}
	*/
	static extractTbc(text) {
		if( this.detectTbc( text ) ){
			return /[a-zA-Z0-9]{11}/.exec( text )[0];
		}else{
			return null;
		}
	}

	/**
	* @desc  检测是否包含链接
	* @param {String}  text
	* @return {Boolean}
	*/
	static detectUrl(text) {
		return /(https?):\/\/(.+).(jd|vip|tmall|taobao|yangkeduo|suning|pinduoduo).com/.test( text );
	}

	/**
     * @desc  收集商品发送数据
     * @param object 数据库
     * @param string 来源信息
     * @param object 商品信息
     */
	static collect( db, method, product ){

		if( !product || !product.item_id ) return;

		let then = new Date();
		let time = then.getTime() / 1000;
		let date = then.format('yyyyMMdd');

		//创建 或 重置商品清单
		if( typeof this.goods == 'undefined' || this.goods.date != date ){
			this.goods = { 'date' : date };
		}

		//console.log( this.goods );

		//已经存在某商品
		if( this.goods[ product.item_id ] ){
			db.query('UPDATE `pre_order_effect` SET sends_num = sends_num + 1, updated_time = ? WHERE method = ? AND item_id = ? AND created_date = ?', [ time, method, product.item_id, date ] );			
		}else{
			db.query('INSERT INTO `pre_order_effect` (method, platform, item_id, sends_num, created_time, created_date) VALUES(?, ?, ?, 1, ?, ?)', [ method, product.platform, product.item_id, time, date ] );
			this.goods[ product.item_id ] = product;
		}

	}

	/**
     * @desc  更新状态信息
     * @param object 数据库
     * @param integer 用户Id
     * @param object 状态信息
     */
	static pushed( db, member_id, body ) {

		var pushed = null;

		if( body.err && body.err.indexOf('NOTCHATROOMCONTACT') > -1 ){
			pushed = '请检查您的微信群是否有效?';
		}

		if( body.err && body.err.indexOf('退出微信') > -1 ){
			pushed = '请检查微信是否在登录状态?';
		}

		if( body.err && body.err.indexOf('转链失败') > -1 ){
			pushed = '请检查淘宝备案是否有效?';
		}

		return db.query('UPDATE `pre_member_weixin` SET pushed = ?, status = ?, status_time = UNIX_TIMESTAMP() WHERE member_id = ?', [ pushed, JSON.stringify( body ), member_id ] );
	}

	/**
     * @desc  写入活动状态
     * @param object 数据库
     * @param string 渠道
     * @param object 消息数据
     * @param string 方式
     */
	static record( db, channel, message, method = '' ) {

		let then = new Date();
		let time = then.getTime() / 1000;
		let date = then.format('yyyyMMdd');
		let body = ( typeof message == 'object' ) ? JSON.stringify( message ) : message;

		return db.query('INSERT INTO `pre_weixin_logs` (channel, message, method, created_time, created_date) VALUES(?, ?, ?, ?, ?)', [ channel, body, method, time, date ] );
	}

}

module.exports = Activity;
