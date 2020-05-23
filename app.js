
const Common = require('./lib/common');
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

//账号
if (func == 'account') {	
	let save = Common.getArgv('save', './');
	let wxid = Common.getArgv('wxid');
	let klas = new Account(conf, save);
		klas.init( wxid );
}