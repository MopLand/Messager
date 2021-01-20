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
		// return /(¥|￥|\$|£|₤|€|₴|¢|₰|₳|₪|₲|₵|@|《|》|\(|\)|\/)([a-zA-Z0-9]{11})(¥|￥|\$|£|₤|€|₴|¢|₰|₳|₪|₲|₵|@|《|》|\(|\)|\/)/.test( text );
		return /(\W+)([a-zA-Z0-9]{11})(\W+)/.test( text );
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
	 * @desc 替换口令文案
	 * @param {String} text 
	 */
	static randomTbc(text, tbctext) {

		if (/(猫超券|淘密令|Tao密令)/.test(text)) {
			return text;
		}

		let str = ['(',')','€','₰','₲','《','$','₤','₪','¢','₵','₳','₴'];
		let end = ['￥','¥','€','₰','₲','《','$','₤','₪','¢','₵','₳','₴'];
		let word = [
			'0.领.卷下dan', '0-领.巻链.接', '0.0抢.Gòμ链接', '0-tα0密.令', '0槍.gòμ地址',
			'0.拷钡下.單', '0~下蛋地祉', '0~下dan口.令', '0去~荬吖', '0@领.巻地址', '0-到(ταō·βαó)拍',
			'0去~荬【ταō@βá0】', '0.到τα0雹卖', '0栲呗至《τα0-βá0》', '0.去~啪吖', '0&快.搶', '0-祛荬~',
			'0&咑.開(ταō-βαó)', '0.下Dan密.令', '0-苻祉.下.掸', '0~拍.下立.省', '0選中覆.製', '0抢.gòμ地祉',
			'0.快荬丫', '0-覆.至下dan', '0@去(ταō·βαó)', '0.下dan立.省', '0-优.恵購', '0~领.巻啪',
			'0立即槍.gòu', '0-马上去.搶', '0&快mǎi呀', '0:速度.槍', '0限.时忒恵', '0~领.巻立減', '0-拣.漏冻',
			'0:神.價速.搶', '0.内.部價', '0@超.值購', '0&实.恵購', '0.超.低價', '0:去(ταō·bαó)購',
			'0-到(ταō+bαó)價', '0@去<ταō~bαó>mǎi', '0:狠划.算吖', '0~陋.洞價', '0.底.价䓆扣',
			'0-去(ταō·bαó)槍', '0.立享䓆扣', '0-省.錢Gòu', '0@省.錢立.減', '0.限.时䓆.筘'
		];

		word = tbctext && tbctext.length > 0 ? tbctext : word;

		let txt = this.extractTbc(text);

		if (txt !== null) {

			let num		= Math.floor((Math.random() * 10));
			let strStr	= str[ Math.floor((Math.random() * str.length)) ];
			let endStr	= end[ Math.floor((Math.random() * end.length)) ];
			let wordStr	= word[ Math.floor((Math.random() * word.length)) ];
			let general	= true;

			let tbc = '';

			// 随机口令 文案前后位置
			if ( num % 2 === 0 ) {
				tbc = strStr + txt + endStr + '/';

				// 非猫超券随机生成口令
				if ( general ) {
					tbc = wordStr + ' ' + num + '.0' + tbc;
				}
			} else {
				tbc = strStr + txt + endStr + '/';

				// 非猫超券随机生成口令
				if ( general ) {
					tbc = num + '.0' + tbc + ' ' + wordStr;
				}
			}

			// 普通文案，，替换口令文案，，，猫超券文案只替换符号
			if ( general ) {
				text = text.replace(/\(槍.gòμ地.址:(.+)\)/, tbc);
			} else {
				text = text.replace(/(¥|￥|\$|£|₤|€|₴|¢|₰|₳|₪|₲|₵|@|《|》|\(|\)|\/)([a-zA-Z0-9]{11})(¥|￥|\$|£|₤|€|₴|¢|₰|₳|₪|₲|₵|@|《|》|\(|\)|\/)\//, tbc);
			}
			
			
			if ( isNaN( parseInt( text.slice(0, 1)) ) ) {
				text = '0-' + text;
			}

		}

		return text
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
	 * @desc 检测是否含有 uid 并替换
	 * @param {String} text 用户文案
	 * @return {String}
	 */
	static replaceUid(text, member_id) {

		if (/(&|\?)uid=(\d*)/ig.test(text)) {
			text = text.replace(/uid=(\d*)/ig, 'uid=' + member_id);
		}

		return text;
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

			db.query('UPDATE `pre_weixin_effect` SET sends_num = sends_num + 1, updated_time = ? WHERE method = ? AND item_id = ? AND created_date = ?', [ time, method, product.item_id, date ] );
			
		}else{
			// db.query('INSERT INTO `pre_weixin_effect` (method, platform, item_id, sends_num, created_time, created_date) VALUES(?, ?, ?, 1, ?, ?)', [ method, product.platform, product.item_id, time, date ] );
			let sql = 'SELECT `auto_id`, `platform`, `method`, `item_id`, `created_time` FROM `pre_weixin_effect` WHERE method = ? AND item_id = ? AND created_date = ? ORDER BY `created_time` DESC  LIMIT 1';
			let req = [ method, product.item_id, date ];

			db.query(sql, req, ( err, res ) => {

				if (err) { return; }
		
				if ( res.length > 0 ) {
					db.query('UPDATE `pre_weixin_effect` SET sends_num = sends_num + 1, updated_time = ? WHERE method = ? AND item_id = ? AND created_date = ?', [ time, method, product.item_id, date ]);		
				} else {
					db.query('INSERT INTO `pre_weixin_effect` (method, platform, item_id, sends_num, created_time, created_date) VALUES(?, ?, ?, 1, ?, ?)', [ method, product.platform, product.item_id, time, date ]);
				}
		
			})
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

		if( body.err && body.err.indexOf('已经失效') > -1 ){
			pushed = '请检查您的微信登录状态?';
		}

		/*
		if( body.err && body.err.indexOf('退出微信') > -1 ){
			pushed = '请检查微信是否在登录状态?';
		}

		if( body.err && body.err.indexOf('转链失败') > -1 ){
			pushed = '请检查淘宝备案是否有效?';
		}
		*/

		return db.query('UPDATE `pre_weixin_list` SET pushed = ?, status = ?, status_time = UNIX_TIMESTAMP() WHERE member_id = ?', [ pushed, JSON.stringify( body ), member_id ] );
	}

	/**
     * @desc  更新微信发单状态信息
     * @param object 数据库
     * @param integer 用户信息
     * @param object 状态信息
     */
	static updatePushed( db, user, body ) {

		var pushed = null;

		if( body.err && body.err.indexOf('NOTCHATROOMCONTACT') > -1 ){
			pushed = '请检查您的微信群是否有效?';
		}

		if( body.err && body.err.indexOf('已经失效') > -1 ){
			pushed = '请检查您的微信登录状态?';
		}

		/*
		if( body.err && body.err.indexOf('退出微信') > -1 ){
			pushed = '请检查微信是否在登录状态?';
		}

		if( body.err && body.err.indexOf('转链失败') > -1 ){
			pushed = '请检查淘宝备案是否有效?';
		}
		*/

		return db.query('UPDATE `pre_weixin_list` SET pushed = ?, status = ?, status_time = UNIX_TIMESTAMP() WHERE member_id = ? AND weixin_id = ?', [ pushed, JSON.stringify( body ), user.member_id, user.weixin_id ] );
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
