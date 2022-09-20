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
		//return /(¥|￥|\$|£|₤|€|₴|¢|₰|₳|₪|₲|₵|@|《|》|\(|\)|\/)([a-zA-Z0-9]{11})(¥|￥|\$|£|₤|€|₴|¢|₰|₳|₪|₲|₵|@|《|》|\(|\)|\/)/.test( text );
		//return /(\W+)([a-zA-Z0-9]{11})(\W+)/.test( text );
		//\W 匹配任何非单词字符。等价于 '[^A-Za-z0-9_]'
		return /(\W+)([a-zA-Z0-9]{10,14})(\W+)/.test( text );
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
	 * 生成指定随机整数
	 * @param {integer}} start 
	 * @param {integer} end 
	 */
	static getChinese() {
		const num = parseInt(Math.random() * (10000) + 30000);
		return String.fromCharCode( num );
	}

	/**
	 * 替换口令文案
	 * @param {*} text 
	 * @param {*} tbctext 
	 * @returns 
	 */
	static randomTbc(text, tbctext) {

		//判断是否为其他平台链接，是就跳出
		if( this.detectUrl( text ) ){
			return text;
		}

		if (/(猫超券|淘密令|Tao密令|打开掏.寳|打开淘.寳|密令|淘礼金)/.test(text)) {
			return text;
		}

		let list = text.split('\n');

		for(let i = 0; i < list.length; i++) {

			if (this.detectTbc(list[i])) {
				list[i] = this.replaceTbc(list[i], tbctext);
			}
		}

		return list.join('\n');
	}

	/**
	 * 替换淘口令文案
	 * @param {*} text 
	 * @param {*} tbctext 
	 * @returns 
	 */
	static replaceTbc(text, tbctext) {

		return text; // 口令文案原样返回，陈刚2021-12-12

		// let str = ['(',')','€','₰','₲','《','$','₤','₪','¢','₵','₳','₴'];
		// let end = ['￥','¥','€','₰','₲','《','$','₤','₪','¢','₵','₳','₴'];
		// let code = [
		// 	' ', '!', '"', '%', '&', ',', '，', '。', '*', '+', '-', ':', '：', ';', '；', '<', '>', '?', '{', '}', '~','^', 
		// 	'=', '@', '[', ']', '_', '、', '|', '\'', '【', '】', '\\','·', '«', '»', '‹', '›', '〕', '〔', '〈', '〉', '‘', 
		// 	'’', '—', '｛', '｝', '（', '）', '≠', '≈', '±', '×', '÷', '≥', '≤', '√', '||', '∞', '∫', '∨', '∧', '∩', '∪', 
		// 	'ɑ', '←', '→', '︽', '︾', '¿', 'ā', 'á', 'ǎ', 'à', 'ō', 'ó', 'ǒ', 'ò', 'ē', 'é', 'ě', 'è', 'ê', 'ī', 'í','ǐ', 'ì',  
		// 	'ū', 'ú', 'ǔ', 'ù', 'ń', 'ň', '∂', '⇒', '⇔', '∝', 'β', 'γ', 'δ', 'ε', 'η', 'θ', 'λ', 'μ', 'σ', 'τ', 'φ', 'ψ', 'ω'
		// ];

		// let code 	= [ ' ', '!', '"', '%', '&', ',', '，', '。', '*', '+', '-', ':', '：', ';', '；' ];
		// let china 	= [ '复', '制', '微', '信', '购', '买', '淘', '宝' ]; // 中文

		// 2021-09-18 去中文符号口令，改为以前（陈刚）￥,￥,$,￡,₤,€,₴,￠,₰,₳,₪,₲,₵,@,《,》,(,),/
		let code 	= ['￥','￥','$','￡','₤','€','₴','￠','₰','₳','₪','₲','₵','@','《','》','(',')','/'];
		let china 	= ['￥','￥','$','￡','₤','€','₴','￠','₰','₳','₪','₲','₵','@','《','》','(',')','/'];

		let word = ['领.卷下单', '领.巻链.接', '抢.Gòμ链接', '槍.gòμ地址'];

		word = tbctext && tbctext.text && tbctext.text.length > 0 ? tbctext.text : []; // 线上文案

		code 	= tbctext && tbctext.code && tbctext.code.length > 0 ? tbctext.code : code; // 线上符号
		china 	= tbctext && tbctext.china && tbctext.china.length > 0 ? tbctext.china : china; // 中文

		let txt = this.extractTbc(text);

		if (txt !== null) {

			let num		= Math.floor((Math.random() * 10)) + ( parseInt((Math.random() * 10)) % 2 === 0 ? '' : '.' + Math.floor((Math.random() * 10)) ); // 随机开头数字
			let strStr	= parseInt((Math.random() * 10)) % 2 === 0 ? code[ Math.floor((Math.random() * code.length)) ] : china[ Math.floor((Math.random() * china.length)) ]; // 淘口令前面的符号
			let endStr	= parseInt((Math.random() * 10)) % 2 === 0 ? code[ Math.floor((Math.random() * code.length)) ] : china[ Math.floor((Math.random() * china.length)) ]; // 淘口令后面的符号
			let wordStr	= word.length > 0 ? word[ Math.floor((Math.random() * word.length)) ] : ''; // 随机文案

			let tbc = strStr + txt + endStr; // 组合带符号的淘口令

			let jg = '~'; // 汉字间隔

			// 随机口令 文案前后位置
			if ( num % 2 === 0 ) {
				
				if ( code.indexOf(tbc.substr(0, 1)) > -1) {
					jg = '';
				}

				// 文案在前 num + wordStr + jg + tbc
				tbc = wordStr + jg + tbc;
			} else {

				if ( code.indexOf(tbc.substr(-1, 1)) > -1) {
					jg = '';
				}

				// 文案在后 num + tbc + jg + wordStr
				tbc = tbc + jg + wordStr;
			}

			// text = text.replace(/\((槍.gòμ地.址|淘秘令|下dan链接):(.+)\/\)/, tbc);
			text = tbc;
			
			// if ( isNaN( parseInt( text.slice(0, 1)) ) ) {
			// 	text = '0.0' + text;
			// }

			if (text.substr(-1, 1) != '/') {
				text += '/';
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
		return /(https?):\/\/(.+).(jd|vip|tmall|taobao|yangkeduo|suning|pinduoduo|kaola|youpin).com/.test( text );
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
	 * @desc 替换文案邀请码
	 * @param {String} text 用户文案
	 * @return {String}
	 */
	static replaceInvite(text, invite) {

		if (/\{邀请码\}/.test(text)) {
			text = text.replace('{邀请码}', invite);
		}

		return text;
	}

	/**
     * @desc  收集商品发送数据
     * @param object 数据库
     * @param string 来源信息
     * @param object 商品信息
	 * @param string 消息包id（微信msgid）
     */
	static collect( db, method, product, msgid = null ){

		if( !product || !product.item_id ) return;

		let then = new Date();
		let time = then.getTime() / 1000;
		let date = then.format('yyyyMMdd');
		let rwid = product.item_id + '';
		let tail = rwid.substring( rwid.indexOf('-') + 1 )

		//创建 或 重置商品清单
		if( typeof this.goods == 'undefined' || this.goods.date != date ){
			this.goods = { 'date' : date };
		}

		//console.log( this.goods );
		let key = method + tail + msgid;
		let packSql = '';

		if (msgid) {
			packSql = ' AND package = ? ';
		}

		//已经存在某商品
		if( this.goods[ key ] ){

			let sql = 'UPDATE `pre_weixin_effect` SET sends_num = sends_num + 1, updated_time = ? WHERE method = ? AND platform = ? AND item_suffix = ? AND created_date = ?' + packSql;
			let req = [ time, method, product.platform, tail, date ];

			packSql != '' && req.push(msgid);

			db.query(sql, req);
			
		}else{
			// db.query('INSERT INTO `pre_weixin_effect` (method, platform, item_id, sends_num, created_time, created_date) VALUES(?, ?, ?, 1, ?, ?)', [ method, product.platform, product.item_id, time, date ] );

			let sql = 'SELECT `auto_id`, `platform`, `method`, `item_id`, `created_time` FROM `pre_weixin_effect` WHERE method = ? AND platform = ? AND item_suffix = ? AND created_date = ? ' + packSql +' ORDER BY `created_time` DESC  LIMIT 1';
			let req = [ method, product.platform, tail, date ];

			packSql != '' && req.push( msgid );

			db.query(sql, req, ( err, res ) => {

				if (err) { return; }
		
				if ( res.length > 0 ) {
					let usql = 'UPDATE `pre_weixin_effect` SET sends_num = sends_num + 1, updated_time = ? WHERE method = ? AND platform = ? AND item_suffix = ? AND created_date = ? ' + packSql;
					let ureq = [ time, method, product.platform, tail, date ];

					packSql != '' && ureq.push( msgid );

					db.query(usql, ureq);
				} else {
					db.query('INSERT INTO `pre_weixin_effect` (package, method, platform, item_id, item_suffix, sends_num, created_time, created_date) VALUES(?, ?, ?, ?, 1, ?, ?)', [ msgid, method, product.platform, rwid, tail, time, date ]);
				}
		
			})
			this.goods[ key ] = product;
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

		if( body.special && 'beian' == body.special ){
			if ( body.platform && 'taobao' == body.platform ) {
				pushed = '【云发单】请在APP内找任意淘宝商品点“购买省”完成授权，以免影响正常发单！';
			}

			if ( body.platform && 'pinduoduo' == body.platform ) {
				pushed = '【云发单】请在APP内搜索任意拼多多商品点“购买省”完成授权，以免影响正常发单！';
			}
		}

		let tagnum = body.isAbort ? 8 : 0;

		return db.query('UPDATE `pre_weixin_list` SET pushed = ?, status = ?, status_time = UNIX_TIMESTAMP(), tag = tag | ' + tagnum + ' WHERE member_id = ? AND weixin_id = ?', [ pushed, JSON.stringify( body ), user.member_id, user.weixin_id ] );
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

	/**
	 * @desc 批量转链扩展参数
	 * @param string 文本文案
	 */
	static getExternal( text ) {

		if ( text.indexOf('百亿补贴') > -1 ) {
			return '&umpChannel=bybtqdyh&u_channel=bybtqdyh';
		}

		if ( text.indexOf('超值买返') > -1 ) {
			return '&umpChannel=czmfkqg&u_channel=czmfkqg';
		}
		
		if ( text.indexOf('签到红包') > -1 ) {
			return '&fpChannel=9';
		}

		if ( text.indexOf('省钱卡频道专享红包') > -1 ) {
			return '&fpChannel=28';
		}

		if ( text.indexOf('抵扣商品红包') > -1 ) {
			return '&fpChannel=16';
		}

		// 拼多多
		if ( text.indexOf('话费') > -1 && text.indexOf('拼多多官方') > -1 ) {
			return 'pddRecharge';
		}

		// 拼多多
		/*
		if ( text.indexOf('无门槛') > -1 && text.indexOf('拼多多') > -1 ) {
			return 'pddSuper';
		}
		*/

		return '';
	}

}

module.exports = Activity;
