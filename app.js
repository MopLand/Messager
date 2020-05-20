
const Common = require('./lib/common');
const Groups = require('./src/groups');
const Moment = require('./src/moment');
const Account = require('./src/account');
const Messager = require('./src/messager');

let conf = Common.getConf(__dirname);
let func = Common.getFunc();

//消息推送，默认方法
if (!func || func == 'messager') {
	let test = Common.getArgv('debug');
	let klas = new Messager(conf, test);
}

//朋友圈
if (func == 'moment') {
	let klas = new Moment(conf);
}

//微信群
if (func == 'groups') {
	let klas = new Groups(conf);
}

//账号
if (func == 'account') {
	let klas = new Account(conf);
}