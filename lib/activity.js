'use strict'

/**
 * 营销活动类
 * Created by veryide@qq.com on 2024-03-28.
 */

class Activity {

	//商品队列
	static queue = {}

	//监控队列
	static monit = {}

	/**
	 * 构造函数
	 */
	constructor() {
	}

	/**
	* @desc  检测是否包含口令
	* @param {String} text
	* @param {String} size
	* @return {Boolean}
	*/
	static detectTbc(text, size) {
		//return /(?<tag>[¥|￥|\$|£|₤|€|₴|¢|₰|₳|@|《|》|\(|\)|\/])([a-zA-Z0-9]{11})(?&tag)/.test( text );
		//return /(¥|￥|\$|£|₤|€|₴|¢|₰|₳|₪|₲|₵|@|《|》|\(|\)|\/)([a-zA-Z0-9]{11})(¥|￥|\$|£|₤|€|₴|¢|₰|₳|₪|₲|₵|@|《|》|\(|\)|\/)/.test( text );
		//return /(\W+)([a-zA-Z0-9]{11})(\W+)/.test( text );

		//\W 匹配任何非单词字符。等价于 '[^A-Za-z0-9_]'
		//return /(\W+)([a-zA-Z0-9]{10,14})(\W+)/.test( text );

		//口令内必需有英文字母
		//(\W+)((?=.*[a-zA-Z])[a-zA-Z0-9]{10,14})(\W+)

		//换行符不能当口令字符
		//(\W+)(?<!\n)((?=.*[a-zA-Z])[a-zA-Z0-9]{10,14})(?!\n)(\W+)

		//尾巴补一个空格，防止口令在结尾缺少结束符的问题
		var mat = new RegExp('(\\W+)((X|X\-)?[a-zA-Z0-9]{'+ ( size || '10,14' ) +'})(\\W+)').exec( text + ' ' );
		var ret = mat && !/^\d+$/.test( mat[2] );
		return ret ? mat[2] : null;
	}

	/**
	* @desc  提取淘口令主体
	* @param {String} text
	* @param {String} size
	* @return {String}
	*/
	static extractTbc(text, size) {
		let ret = this.detectTbc( text, size );
		if( ret ){
			return ret;
		}else{
			return null;
		}
	}

	/**
	 * 生成指定随机整数
	 * @param {integer} start 
	 * @param {integer} end 
	 */
	static getChinese() {
		const num = parseInt(Math.random() * (10000) + 30000);
		return String.fromCharCode( num );
	}

	/**
	* @desc  检测是否包含链接
	* @param {String}  text
	* @param {RegExp}  rule
	* @return {Boolean}
	*/
	static detectUrl(text, rule) {
		if( rule ){
			return rule.test( text );
		}else{
			return /(https?:\/\/)?(\w+\.)?(3|u\.f(\d)url|jd|vip|tmall|taobao|yangkeduo|suning|pinduoduo|kaola|youpin|jinritemai|douyin|tb|mt|meituan|dpurl|didi|huaxz|suvmothq|yuebai|yuebuy|maishou|my22|lg22|mlj94|xingfan|navo|5kma|pk81|ujdxx|jdcom|y\-03|lg(\d+)|kurl(\d+)|kzurl(\d+))\.(com|cc|co|hk|cn|tv|fun|info|top|love|plus|tv|fit|art|pub|red|ren|vip|uno|link)/i.test( text );
		}
	}

	/**
	* @desc  检测是否包小程序
	* @param {String}  text
	* @return {Boolean}
	*/
	static detectApp(text) {
		return /#小程序:\/\/(快手|拼多多|唯品会)(特卖|特惠|福利券|限时折扣|短视频|优惠商品推荐)\/(.+)/i.test( text ) || /mp:\/\/(.+)/i.test( text );
	}

	/**
	 * @desc 指定范围内的随机数
	 * @param integer 起始值
	 * @param integer 结束值
	 * @return {Integer}
	 */
	static randomNum(n, m) {
		return Math.floor(Math.random() * (m - n + 1) + n);
	}

	/**
	 * @desc 检测是否含有 uid 并替换
	 * @param {String} text 用户文案
	 * @return {String}
	 */
	static replaceUserid(text, userid) {
		if ( /\{RND\}/.test(text) ) {
			text = text.replace(/{RND}/ig, this.randomNum(1000,9999));
		}
		if ( /\{UID\}/.test(text) ) {
			text = text.replace(/{UID}/ig, userid);
		}
		if ( /(&|\?)uid=(\d*)/ig.test(text) ) {
			text = text.replace(/uid=(\d*)/ig, 'uid=' + userid);
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
	 * @param object 实例类
	 * @param string 来源信息
	 * @param object 商品信息
	 * @param object 原始消息，需要用到消息包id和拉取时间
	 * @param object 扩展信息：{ source: time }
	 * @param boolean 最后一个用户
	 * @return {Array}
	 */
	static collect( caller, method, product, rawdata, extra = {}, last ){

		if( !product || !product.item_id || product.item_id == '0' ) return;

		var self = this;
		var [source] = Object.keys(extra);
		let rwid = product.item_id + '';
		//let tail = rwid.substring( rwid.search(/[-_]/) + 1 );
		let tail = rwid.replace('-','_').split('_').pop();
		let yymd = new Date(rawdata.created * 1000).format('yyyyMMdd');
		let hash = method + '_' + tail + '_' + source + '_' + yymd;

		//当前队列计数
		if( this.queue.hasOwnProperty( hash ) ){
			this.queue[hash] ++;
		}else{
			this.queue[hash] = 1;
		}

		//最后一个人，或者第一个人
		if( last || this.queue[hash] == 1 ){

			this.monit[hash] = setInterval( () => {

				//调用存储过程写入数据
				let num = self.queue[hash];
				let sql = 'CALL func_weixin_effect( ?, ?, ?, ?, ?, ?, ? )';
				let req = [ rawdata.package, method, product.platform, product.item_id, JSON.stringify(extra), num, rawdata.created ];

				//计数器为零，清除定时
				if( num == 0 ){
					return clearInterval( self.monit[hash] );
				}

				//提交数据，重置计数器
				self.queue[hash] -= num;

				return caller.mysql.query(sql, req, function( err, ret ){
					if( err ){
						return console.error( err, req );
					}else{
						return console.log( ret );
					}
				});

			}, 1000 * this.randomNum( 15, 30 ) );

		}

		return { 'package': rawdata.package, 'product': product, 'source': source, 'hash': hash, 'size': this.queue[hash], 'last': last };

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

		return db.query('UPDATE `pre_weixin_list` SET pushed = ?, status = ?, status_time = UNIX_TIMESTAMP(), tag = tag | ' + tagnum + ' WHERE auto_id = ?', [ pushed, JSON.stringify( body ), user.auto_id ] );
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
	 * @return {String}
	 */
	static getExternal( text ) {

		if ( text.search( /(百亿|百补|百亿补贴)/ ) > -1 ) {
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
