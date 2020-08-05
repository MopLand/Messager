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
	worked: 8,

	//当前微信号：清清
	wechat: 'wxid_okvkiyguz1yh22',

	//朋友圈
	moment: {

		//监听来源
		follow: 'wxid_ig5bgx8ydlbp22',

		//忽略标识符
		ignore: 'SKIP',
	
		//原样标识符
		origin: /KEEP|猫超券/,

		//遇错误中断发送
		cancel: /MMSNS_RET_SPAM/,

		//消息子分类
		source: 'taobao',

		//消息时间戳
		marker: 'mm_moment_id',

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
		origin: /猫超券/,

		//消息子分类
		source: 'taobao',

		//消息时间戳
		marker: 'mm_groups_id',

		//Redis消息频道
		channel: 'mm_groups',

		//处理心跳
		heartbeat: true,

	}

}

module.exports = conf;