'use strict'

const Common = require('./lib/common');
const Account = require('./src/account');

let conf = Common.getConf( __dirname );
let step = Common.getArgv( 'step' );
let user = new Account();


/*
function say() {
	return new Promise(function(resolve, reject) {
		setTimeout(function() {
			let age = 26
			resolve(`hello, joel。今年我 ${age} 岁`);
		}, 1000);
	});
}

async function demo() {
	const v = await say(); // 输出：hello, joel。今年我 26 岁  等待这个say 的异步，如果成功把回调 resole 函数的参数作为结果
	//console.log(typeof v);
	return v;
}

console.log( demo() );

return;
*/

if( step == 'login' ){

	var ret = user.login();
		ret.then( data => {
			console.log( data.Uuid, data.ExpiredTime );
		} )

	console.log( ret );
}

if( step == 'check' ){

	let uuid = Common.getArgv( 'uuid' );

	var ret = user.check( uuid );

	console.log( ret );

}
