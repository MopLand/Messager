
const Common = require('./lib/common');
const Loader = require('./lib/loader');
const Logger = require('./lib/logger');
const Groups = require('./src/groups');
const Moment = require('./src/moment');
const Account = require('./src/account');
const Messager = require('./src/messager');
const Heartbeat = require('./src/heartbeat');
const Forward = require('./src/forward');
const MomentSend = require('./src/moment_send');
const GroupsSend = require('./src/groups_send');

let conf = Common.getConf(__dirname);
let func = Common.getFunc();

const tag = Common.fileName( __filename, false );
const log = new Logger(tag);

// 清理日志;
log.clean();

process.env.UV_THREADPOOL_SIZE = 128;
console.log( '-------------' + Common.getTime() +'-------------' );

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

//用户自主推送（作废）
if (func == 'forward') {
	let klas = new Forward(conf);
		klas.init();
}

//用户自主推送 (在用)
if (func == 'forward_new') {
	const ForwardNew = require('./src/forward_new');
	let klas = new ForwardNew(conf);
		klas.init();
}

//采集用户消息（作废）
if (func == 'materiel_groups') {
	const MaterielGroups = require('./src/materiel_groups');
	let klas = new MaterielGroups(conf);
		klas.init();
}

//多群消息源（在用）
if (func == 'groups_send') {
	let klas = new GroupsSend(conf);
		klas.init();
}

//朋友圈发送（在用，先转链后发送）
if (func == 'moment_send') {
	let klas = new MomentSend(conf);
		klas.init(func);
}

//营销素材发圈（在用）
if (func == 'moment_mtl') {
	let klas = new MomentSend(conf);
		klas.init( func );
}

//营销商品发圈（作废）
if (func == 'moment') {
	let klas = new Moment(conf);
		klas.init();
}

//微信群（作废）
if (func == 'groups') {
	let item = Common.getArgv('item', 'groups');
	let klas = new Groups(conf);
		klas.init( item );
}

//云课程
if (func == 'course') {
	let item = Common.getArgv('item', 'course');
	let klas = new Course(conf);
		klas.init( item );
}

//联系人
if (func == 'contact') {

	let room = Common.getArgv('room');
	let weixin = Common.getArgv('weixin', conf.wechat);

	let klas = new Account(conf);
		klas.contact( weixin, room );

}

//心跳
if (func == 'heartbeat') {
	let inst = Common.getArgv('inst', 1);
	let klas = new Heartbeat(conf);
		klas.init( inst );
}

// 自动登陆
if (func == 'autologin') {
	const AutoLogin = require('./src/autologin');
	let klas = new AutoLogin(conf);
		klas.init();
}

//账号
if (func == 'account') {

	let save = Common.getArgv('save', './');
	let weixin = Common.getArgv('weixin');
	let device = Common.getArgv('device');

	let klas = new Account(conf, save);
		klas.init( weixin, device );

}

//口令提取
if (func == 'password') {
	const Activity = require('./lib/activity');

	let text = Common.getArgv('text');
	let size = Common.getArgv('size');
	let word = Activity.extractTbc( text, size );

	console.log( word );

}

//链接提取
if (func == 'links') {

	let text = Common.getArgv('text');
	let link = text.match( /(https?):\/\/[-A-Za-z0-9+&@#\/%?=~_|!:,.;]+[-A-Za-z0-9+&@#\/%=~_|]/gm );

	console.dir( text );
	console.dir( link );
	console.dir( false == false );

}