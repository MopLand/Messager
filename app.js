
const Common = require('./lib/common');
const Loader = require('./lib/loader');
const Logger = require('./lib/logger');

let func = Common.getFunc();
let conf = Common.getConf(__dirname);

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

//用户自主推送 (在用)
if (func == 'forward_new') {
	const ForwardNew = require('./src/forward_new');
	let klas = new ForwardNew(conf);
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
	process.exit();
}

// 调试单元
if (func == 'test') {
	let inst = new Date().format('h');
	console.log( inst );
	let zone = ['sh', 'sz'].indexOf( conf.region );
	console.log( conf.region );
	console.log( zone );
	process.exit();
}

// 活动实例
if (func == 'activity') {
	const act = require('./lib/activity');
	let text = Common.getArgv('text', '?uid=10000&rnd={RND}');
	let inst = act.replaceUserid( text, 10008 );
	console.log( inst );
	process.exit();
}

// 批量转链
if (func == 'transfer') {

	const qs = require('querystring');
	const req = require('./lib/request');

	let url = conf.convert + '?' + qs.stringify( { 'member_id': 10008, 'product': 'true', 'roomid': '', 'lazy_time': Common.getTime(), 'source': 'yfd', 'external': '' } );
	let txt = Common.getArgv('txt', '￥SSPV3XMlWRE￥');

	console.log( url );

	req.post( url, { 'content': txt }, (code, body) => {
		console.log( code, body );
	}, null, conf.options);

	process.exit();

}

// 处理集合
if (func == 'collect') {

	const fs = require('fs');
	const GroupsSend = require('./src/groups_send');

	let klas = new GroupsSend(conf);
	let text = fs.readFileSync('./tpl/single.xml').toString();
	let desc = klas.parseRecord( text );

	let tpl = desc.split( klas.spliter );
	let val = desc.replace( /<datadesc>(.+?)<\/datadesc>/gs, () => { return '<datadesc>'+ Common.randomPos( 9999 ) +'<\/datadesc>'; } ).split( klas.spliter );
	//console.log( tpl );
	//console.log( val );

	tpl.forEach( ( bk, ps ) => {
		//console.log( bk, text.indexOf( bk ) );
		text = text.replace( bk, val[ps] );
	} );

	console.log( text );
	process.exit();

}