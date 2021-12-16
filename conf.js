var conf = {

	//友盟 APPID/Key
	iphone: {
		appid: '',
		appkey: '',
	},
	
	android: {
		appid: '',
		appkey: '',
	},

	//小米推送
	activity: 'com.example.app.activity.MipushTestActivity',

	//别名标识
	aliastag: '',

	//状态上报
	report: 'http://api.example.com/report',

	//转链接口
	convert: 'http://api.example.com/transtxt',
	options: { },

	//微信通信
	weixin: 'http://127.0.0.1/',

	//Redis
	redis: {
		host     : '127.0.0.1',
		port     : 6379,
		password : '',
		prefix   : '',
	},

	//MySQL
	mysql: {
		host     : '127.0.0.1',
		user     : 'root',
		password : 'root',
		database : 'project_jellybox'
	},

	//工作时间段
	worked: 6,

	//有效心跳秒
	active : 60 * 30,

	//当前微信号：清清
	wechat: 'wxid_okvkiyguz1yh22',

	//发圈尾巴
	slogan: null,

	//允许的小程序
	minapp: null,

	//朋友圈
	moment: {

		//监听来源
		follow: 'wxid_ig5bgx8ydlbp22',

		//忽略标识符
		ignore: 'SKIP',
	
		//原样标识符
		origin: /KEEP|猫超券|淘礼金|淘密令|京东券/,

		//遇错误中断发送
		cancel: /MMSNS_RET_SPAM/,

		//消息子分类
		source: 'taobao',

		//消息时间戳
		marker: 'mm_moment_id',

		//遇错误中断发送
		//cancel: /MMSNS_RET_SPAM/,

	},

	// 营销素材
	moment_mtl: {

		//监听来源 呱呱
		follow: 'wxid_i4ref87nfsnh22',

		//忽略标识符
		ignore: 'SKIP',
	
		//原样标识符
		origin: /KEEP|猫超券/,

		//遇错误中断发送
		cancel: /MMSNS_RET_SPAM/,

		//消息子分类
		source: 'taobao',

		//消息时间戳
		marker: 'mm_moment_mtl_id',

		//遇错误中断发送
		//cancel: /MMSNS_RET_SPAM/,

		// 无评论一样发圈 
		nocomment: true,
	},

	//微信群
	groups: {

		//监听来源
		//微信群ID：云发单测试群
		follow: '22997642011@chatroom',

		//微信群接收人：糖糖
		//talker : 'wxid_35ipm1ssbbbc22',
		talker: '',

		//迟延标识符
		retard: '分割线',

		//内容有效性
		detect: /[\u4e00-\u9fa5]/,
	
		//原样标识符
		origin: /猫超券|淘礼金/,

		//消息子分类
		source: 'taobao',

		//消息时间戳
		marker: 'mm_groups_id',

		//Redis消息频道
		channel: 'mm_groups',

	},

	// 多源头群
	groups_send: {

		// 红包链接缓存
		card_cache: 'mm_wmcard_',

		// 红包消息标题
		card_title: '叮！吃饭时间到了，给你们准备好了外卖紅包，快来领吧',

		// 外卖红包卡片文案配置
		card_config: 'https://proxy.guodongbaohe.com/assets/cardConfig',

		// 生成美团外卖链接接口
		meituan: 'https://proxy.guodongbaohe.com/meituan/coupon',

		// 生成饿了么外卖链接接口
		element: 'https://app.guodongbaohe.com/event/go/d1PCDE',

		// 卡片时间
		card_time: [11, 17],

		// 卡片 发红包分钟
		card_minute: 30,

		// 禁发红包消息源头群
		card_rooms: [],

		// 猫超券
		origin: /猫超券|淘礼金|淘密令|京东券/,

	},

	// 采集群消息配置
	materiel_groups: {
		// 监控账号: 浅浅
		wechat: 'wxid_rvdv09jjpgox22',

		// 被采集账号 美莉
		listen: [ 'wxid_u2t5yvs6q30722' ],

		// 定时采集时间间隔 单位秒 默认10秒
		time_interval: 20
	},

	// 朋友圈（新，先转链后发圈）
	moment_send: {

		//忽略标识符
		ignore: 'SKIP',
	
		//原样标识符
		origin: /KEEP|猫超券|淘礼金|淘密令|京东券/,

		//遇错误中断发送
		cancel: /MMSNS_RET_SPAM/,

		//消息时间戳
		marker: 'mm_moment_id'
	}

}

module.exports = conf;