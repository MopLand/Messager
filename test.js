
const System = require('./lib/system');
const Weixin = require('./lib/weixin');

let conf = System.getConf( __dirname );
let test = System.getArgv( 'debug' );

var wx = new Weixin( 'http://180.97.238.53:5432/api/' );

var fn = wx.GetLoginQrCode();

	fn.then( ret => {
		console.log( ret );
		System.SavePic( ret.QrBase64, 'qr.png' );
	}).catch( msg => {
		console.log( msg );
	});
