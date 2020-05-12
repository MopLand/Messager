
const System = require('./lib/system');
const Weixin = require('./lib/weixin');

let conf = System.getConf( __dirname );
let step = System.getArgv( 'step' );

var wx = new Weixin( 'http://180.97.238.53:5432/api/' );

if( step == 'login' ){

	var fn = wx.GetLoginQrCode();
	
		fn.then( ret => {
			console.log( ret );
			System.SavePic( decodeURIComponent( ret.QrBase64 ), 'qr.png' );
		}).catch( msg => {
			console.log( msg );
		});

}

if( step == 'check' ){

	let id = System.getArgv( 'uuid' );

	var fn = wx.CheckLogin( id );

		fn.then( ret => {
			console.log( ret );
		}).catch( msg => {
			console.log( msg );
		});

}

if( step == 'moment' ){

	let wxid = System.getArgv( 'wxid' );
	let type = System.getArgv( 'type', "0" );
	let title = System.getArgv( 'title' );

	console.log( type );

	var fn = wx.SendFriendCircle( wxid, type, title );

		fn.then( ret => {
			console.log( ret );
		}).catch( msg => {
			console.log( msg );
		});

}