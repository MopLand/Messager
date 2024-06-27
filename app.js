
const Common = require('./lib/common');
const Loader = require('./lib/loader');
const Logger = require('./lib/logger');

let conf = Common.getConf(__dirname);
let func = Common.getFunc();

const tag = Common.fileName( __filename, false );
const log = new Logger(tag);

// 清理日志;
log.clean( 5 );

process.env.UV_THREADPOOL_SIZE = 128;
console.log( '-------------' + Common.getTime() +'-------------' );

//消息推送，默认方法
if (!func || func == 'messager') {
	const Messager = require('./src/messager');
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
	const Forward = require('./src/forward');
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
	const GroupsSend = require('./src/groups_send');
	let klas = new GroupsSend(conf);
		klas.init();
}

//群消息SW（在用）
if (func == 'socket_send') {
	const SocketSend = require('./src/socket_send');
	let klas = new SocketSend(conf);
		klas.init();
}

//朋友圈发送（在用，先转链后发送）
if (func == 'moment_send') {
	const MomentSend = require('./src/moment_send');
	let klas = new MomentSend(conf);
		klas.init(func);
}

//营销素材发圈（在用）
if (func == 'moment_mtl') {
	const MomentSend = require('./src/moment_send');
	let klas = new MomentSend(conf);
		klas.init( func );
}

//营销商品发圈（作废）
if (func == 'moment') {
	const Moment = require('./src/moment');
	let klas = new Moment(conf);
		klas.init();
}

//微信群（作废）
if (func == 'groups') {
	const Groups = require('./src/groups');
	let item = Common.getArgv('item', 'groups');
	let klas = new Groups(conf);
		klas.init( item );
}

//云课程
if (func == 'course') {
	const Groups = require('./src/course');
	let item = Common.getArgv('item', 'course');
	let klas = new Course(conf);
		klas.init( item );
}

//联系人
if (func == 'contact') {
	const Account = require('./src/account');

	let room = Common.getArgv('room');
	let weixin = Common.getArgv('weixin', conf.wechat);

	let klas = new Account(conf);
		klas.contact( weixin, room );

}

//心跳
if (func == 'heartbeat') {
	const Heartbeat = require('./src/heartbeat');
	let klas = new Heartbeat(conf);
		klas.init();
}

// 自动登陆
if (func == 'autologin') {
	const AutoLogin = require('./src/autologin');
	let klas = new AutoLogin(conf);
		klas.init();
}

// 微信实例
if (func == 'instance') {
	const wx = require('./lib/weixin');
	let wxid = Common.getArgv('wxid', 'veryide');
	let klas = new wx(conf.weixin, conf.reserve, conf.special);
	let inst = klas.instance( 10008 ).GetProfile( wxid );
	console.log( inst );
}