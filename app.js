
const System = require('./lib/system');
const Request = require('./lib/request');
const Messager = require('./lib/messager');

let conf = System.getConf( __dirname );
let test = System.getArgv( 'debug' );

//console.log( System.weight( 0.2 ) );
//return;

var msg = new Messager( conf, test, (status, msg, chance = 1) => {

	//上报状态信息
	if( conf.report && System.weight( chance ) ){
		Request.status( conf.report, 'Messager', status.length, status);
	}

} );
