'use strict'

/**
 * 营销活动类
 * Created by veryide@qq.com on 2020-05-12.
 */

class Activity {

    /**
     * 构造函数
     */
	constructor() {

	}

	/**
	* @desc  检测是否包含口令
	* @param {Object}  text
	* @return {Boolean}
	*/
	static detectTbc(text) {
		return /(¥|￥|\$|£|₤|€|₴|¢|₳|@|《|》|\()([a-zA-Z0-9]{11})(\1|\))/.test( text );
	}

	/**
	* @desc  检测是否包含链接
	* @param {Object}  text
	* @return {Boolean}
	*/
	static detectUrl(text) {
		return /(https?):\/\/(.+).(jd|vip|tmall|taobao|yangkeduo|suning|pinduoduo).com/.test( text );
	}

}

module.exports = Activity;
