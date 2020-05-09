var conf = {
	'iphone': ['', ''],
	'android': ['', ''],
	'aliastype': '',
	'activity': 'com.guodongbaohe.app.activity.MipushTestActivity',
	'redis.host': '127.0.0.1',
	'redis.port': 6379,
	'redis.password': '',
}

/////////////////////////////

try {
	var exts = require('./extend');
	for (k in exts) {
		conf[k] = exts[k];
	}
	console.log('Loaded module extend.js');
	console.log(exts);
} catch (error) {
	console.log('Not found extend.js');
}

module.exports = conf;