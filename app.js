
const Common = require('./lib/common');
const Request = require('./lib/request');
const Messager = require('./lib/messager');

let conf = Common.getConf( __dirname );
let test = Common.getArgv( 'debug' );

var msg = new Messager( conf, test, (status, msg, chance = 1) => {

	//上报状态信息
	if( conf.report && Common.weight( chance ) ){
		Request.status( conf.report, 'Messager', status.length, status);
	}

} );
