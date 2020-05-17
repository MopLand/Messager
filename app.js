
const Common = require('./lib/common');
const Request = require('./lib/request');
const Groups = require('./src/groups');
const Moment = require('./src/moment');
const Messager = require('./src/messager');

let conf = Common.getConf(__dirname);
let func = Common.getFunc();

//消息推送，默认方法
if (!func || func == 'messager') {

	let test = Common.getArgv('debug');

	let klas = new Messager(conf, test, (status, msg, chance = 1) => {

		//上报状态信息
		if (conf.report && Common.weight(chance)) {
			Request.status(conf.report, 'Messager', status.length, status);
		}

	});

}

//朋友圈
if (func == 'moment') {

	let klas = new Moment(conf);

}

//微信群
if (func == 'groups') {

	let klas = new Groups(conf);

}