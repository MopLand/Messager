
const Common = require('./lib/common');
const Loader = require('./lib/loader');
const Groups = require('./src/groups');
const Moment = require('./src/moment');
const Account = require('./src/account');
const Messager = require('./src/messager');

let conf = Common.getConf(__dirname);
let func = Common.getFunc();

console.log( '--------------------------' );

//消息推送，默认方法
if (!func || func == 'messager') {
	let test = Common.getArgv('debug');
	let klas = new Messager(conf, test);
}

//生成文件加载器
if (func == 'loader') {
	let html = Common.getArgv('html', 'index.html');
	let dist = Common.getArgv('dist', 'dist.js');

	let klas = new Loader();
		klas.init( html, dist );
}

//朋友圈
if (func == 'moment') {
	let klas = new Moment(conf);
		klas.init();
}

//微信群
if (func == 'groups') {
	let klas = new Groups(conf);
		klas.init();
}

//联系人
if (func == 'contact') {

	let room = Common.getArgv('room');
	let weixin = Common.getArgv('weixin', conf.wechat);

	let klas = new Account(conf);
		klas.contact( weixin, room );
		
}

//账号
if (func == 'account') {

	let save = Common.getArgv('save', './');
	let weixin = Common.getArgv('weixin');
	let device = Common.getArgv('device');

	let klas = new Account(conf, save);
		klas.init( weixin, device );

}