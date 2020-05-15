
const Common = require('./lib/common');
const Account = require('./src/account');

let conf = Common.getConf( __dirname );
let step = Common.getArgv( 'step' );
let user = new Account();

if( step == 'login' ){

	var ret = user.login();

	//console.log( ret );
}

if( step == 'check' ){

	let uuid = Common.getArgv( 'uuid' );

	var ret = user.check( uuid );

	console.log( ret );

}
