var conf = {
	'iphone': ['', ''],
	'android': ['', ''],
	'aliastype': '',
	'activity': 'com.guodongbaohe.app.activity.MipushTestActivity',
	'weixin': 'http://localhost:62677/api/',
	'report': 'http://api.example.com/report',
	'convert': 'http://api.example.com/convert',
	'tbtoken': /(¥|￥|\$|£|₤|€|₴|¢|₳|@|《|》|\()([a-zA-Z0-9]{11})(\1|\))/,
	'redis': {
		'host': '127.0.0.1',
		'port': 6379,
		'password': '',
		'prefix': '',
	},
	mysql: {
		host     : 'localhost',
		user     : 'me',
		password : 'secret',
		database : 'my_db'
	},

	//当前微信号
	wechat: '',

	//关注的微信号
	follow: {
		//朋友圈
		moment		: 'wxid_ig5bgx8ydlbp22',
		
		//微信群
		groups		: 'me',
		
		//微信群ID
		groups_id	: 'me',
	}
}

module.exports = conf;