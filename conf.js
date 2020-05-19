var conf = {
	'iphone': ['', ''],
	'android': ['', ''],
	'aliastype': '',
	'activity': 'com.guodongbaohe.app.activity.MipushTestActivity',
	'weixin': 'http://gdwechat.free.idcfengye.com/',
	'report': 'http://api.example.com/report',
	'convert': 'https://proxy.guodongbaohe.com/share/transtxt',
	'tbtoken': /(¥|￥|\$|£|₤|€|₴|¢|₳|@|《|》|\()([a-zA-Z0-9]{11})(\1|\))/,
	'redis': {
		'host': '127.0.0.1',
		'port': 6379,
		'password': '',
		'prefix': '',
	},
	mysql: {
		host     : '127.0.0.1',
		user     : 'root',
		password : 'root',
		database : 'project_jellybox'
	},

	//当前微信号
	wechat: 'veryide',

	//关注的微信号
	follow: {
		//朋友圈来源
		moment		: 'wxid_ig5bgx8ydlbp22',
		
		//微信群来源
		groups		: 'wxid_35ipm1ssbbbc22',
		
		//微信群ID
		groups_id	: '18030716674@chatroom',
	}
}

module.exports = conf;