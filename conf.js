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
	activity: 'com.guodongbaohe.app.activity.MipushTestActivity',

	//别名标识
	aliastag: '',

	//状态上报
	report: 'http://api.example.com/report',

	//转链接口
	convert: 'https://proxy.guodongbaohe.com/share/transtxt',

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

	//当前微信号：清清
	wechat: 'wxid_okvkiyguz1yh22',

	//忽略标识符
	ignore: 'SKIP',

	//迟延标识符
	retard: '分割线',

	//关注的微信号
	follow: {
		//朋友圈：小助手
		moment		: 'wxid_ig5bgx8ydlbp22',
		
		//微信群：糖糖
		groups		: 'wxid_35ipm1ssbbbc22',
		
		//微信群ID
		groups_id	: '22997642011@chatroom',
	}
}

module.exports = conf;