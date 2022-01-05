
const Common = require('./lib/common');
const Loader = require('./lib/loader');
const Weixin = require('./lib/weixin');
const Activity = require('./lib/activity');
const Groups = require('./src/groups');
const Moment = require('./src/moment');
const Account = require('./src/account');
const Messager = require('./src/messager');

let conf = Common.getConf( __dirname );
let func = Common.getFunc();

var wx = new Weixin( conf.weixin );

if( func == 'code' ){
	let text = Common.getArgv( 'text' );
	let test = Activity.extractTbc( text );
	console.log( test );
}

if( func == 'send' ){

	var groups = [{"userName":"18935808677@chatroom","nickName":"\u4e0d\u9519\u54df","memberCount":3},{"userName":"19072919829@chatroom","nickName":"\u4e0d\u9519\u54df","memberCount":3}];

	var roomid = groups.map( ele => { return ele.userName } );

	//console.log( roomid );

	let wxid = Common.getArgv( 'wxid' );

	var fn = wx.NewSendMsg( wxid, roomid, 'content', msgSource = '', type = 1);
	
	fn.then( ret => {
		console.log( ret );
	}).catch( msg => {
		console.log( msg );
	});

}

if( func == 'login' ){

	var fn = wx.GetLoginQrCode();
	
		fn.then( ret => {
			console.log( ret );
			Common.SavePic( decodeURIComponent( ret.QrBase64 ), 'qr.png' );
		}).catch( msg => {
			console.log( msg );
		});

}

if( func == 'check' ){

	let id = Common.getArgv( 'uuid' );

	var fn = wx.CheckLogin( id );

		fn.then( ret => {

			console.log( ret );

			if( ret.State <= 0 ){
				console.log( '请完成扫码登录' );
			}

		}).catch( msg => {
			console.log( msg );
		});

}

if( func == 'moment' ){

	let wxid = Common.getArgv( 'wxid' );
	let type = Common.getArgv( 'type', 0 );
	let content = Common.getArgv( 'content' );

	console.log( content );

	var fn = wx.SendFriendCircle( wxid, type, content );

		fn.then( ret => {
			console.log( ret );
		}).catch( msg => {
			console.log( msg );
		});

}

if( func == 'getpop' ){

	let wxid = Common.getArgv( 'wxid' );
	let toWxId = Common.getArgv( 'toWxId', 'wxid_ig5bgx8ydlbp22' );
	let maxid = Common.getArgv( 'maxid', 0 );

	var fn = wx.GetFriendCircleDetail( wxid, toWxId, maxid );

		fn.then( posts => {
			
			//console.log( ret.ObjectList[0] );
			let post = posts.ObjectList[6];
			//let body = Common.parseXml( post.objectDesc.buffer );

			//console.log( post  );
			//return;

			let buffer = post.objectDesc.buffer;

			var texts = /<contentDesc><\!\[CDATA\[(.+?)\]\]><\/contentDesc>/s.exec( buffer )[1];

			var media = /<mediaList>(.+?)<\/mediaList>/.exec( buffer )[1];

			console.log( post );
			//console.log( texts );
			//console.log( media );

			//return;

			//发圈
			let fn = wx.SendFriendCircle( wxid, 9, texts, media );

				fn.then( ret => {

					console.log( '发圈成功', ret );
					//console.log( '发圈成功' );

					//console.log( post.commentUserList );
					//return;

					if( post.commentUserListCount > 0 ){

						let comm = post.commentUserList[0];

						console.log( ret.id, comm );
	
						//评论
						let fn = wx.SendFriendCircleComment( wxid, ret.id, comm.type, comm.content );
	
							fn.then( ret => {
								console.log( '评论成功', ret );		
							}).catch( msg => {
								console.log( 'SendFriendCircleComment', msg );
							});

					}

				}).catch( msg => {
					console.log( msg );
				});

			return;


			return;

			body.then( ret => {

				//主体内容
				console.log( ret );
				//console.log( ret.contentDesc );
				//console.log( ret.ContentObject.contentStyle );
				//console.log( ret.ContentObject.mediaList.media );
				//console.log( ret.ContentObject.mediaList.media[0] );

				//评论内容
				//console.log( post.commentUserList );

				//console.log('Done');


				/////////////

				//return;

				/*
				let media = [];
					ret.ContentObject.mediaList.media.forEach( e => {
						media.push( { url : e.url, ImageUrl : e.thumb, Width : e.size.width, Height : e.size.height, TotalSize : e.size.totalSize } );
					} );
				*/

				console.log( post.ContentObject );

				return;

				let fn = wx.SendFriendCircle( wxid, 9, ret.contentDesc, post.objectDesc.buffer );

					fn.then( ret => {
						console.log( ret );
					}).catch( msg => {
						console.log( msg );
					});

			}).catch( msg => {
				console.log( msg );
				console.log('Done2');
			});
			
		}).catch( msg => {
			console.log( msg );
		});

}

/*
	消息过滤器
*/
var filter = function( AddMsgs, where = {}, size = -1 ){

	var msgs = [];

	for( let i = 0; i < AddMsgs.length; i++ ){

		var idx = 0;
		var msg = AddMsgs[i];

		for( let w in where ){
			if( msg[ w ].String == where[ w ] ){
				idx ++;
			}
		};

		//满足所有条件
		if( idx == Object.keys( where ).length ){
			msgs.push( msg );
		}
	};

	if( size == 1 ){
		return msgs.length ? msgs[0] : null;
	}else{
		return msgs;
	}

}

if( func == 'group' ){

	let wxid = Common.getArgv( 'wxid' );
	let text = Common.getArgv( 'text', '好' );

	var fn = wx.SyncMessage( wxid );

		fn.then( ret => {
			//console.log( ret );

			var group_id = '';

			var chat_room = filter( ret.AddMsgs, { Content : text, FromUserName : wxid }, 1 );

			if( chat_room ){
				group_id = chat_room.ToUserName.String;
			}

			console.log( chat_room, group_id );

		}).catch( msg => {
			console.log( msg );
		});

}

if( func == 'syncmsg' ){

	let wxid = Common.getArgv( 'wxid' );
	let gpid = Common.getArgv( 'gpid' );

	var fn = wx.SyncMessage( wxid );

		fn.then( ret => {
			//console.log( ret );

			var group_id = '';

			var msgs = filter( ret.AddMsgs, { ToUserName : gpid, FromUserName : wxid } );

			/////////////

			//console.log( 'msgs', msgs );
			//console.log( '------------------------' );

			for( let i = 0; i < msgs.length; i++ ){

				var msg = msgs[i];

				console.log( msg, '------------------------' );

				//文字
				if( msg.MsgType == 1 ){
					wx.SendTxtMessage( wxid, [ gpid ], msg.Content.String );
				}

				//图片
				if( msg.MsgType == 3 ){
				//	wx.SendImageMessage( wxid, [ gpid ], msg.ImgBuf.Buffer );
				}

				//视频
				if( msg.MsgType == 4 ){
				//	wx.SendVideoMessage( wxid, [ gpid ], msg.ImgBuf.Buffer );
				}

				//声音
				//if( msg.MsgType >= 5 ){
					//msg.Content.String
					//wx.SendVoiceMessage( wxid, [ gpid ], msg.Content.String );
				//}

				//图片
				if( msg.MsgType == 3 && msg.Content.String.indexOf('<') == 0 ){
							
					var fn = wx.SendForwardImg( wxid, [ gpid ], msg.Content.String );

					fn.then( ret => {
						console.log( 'ret', ret );
					}).catch( err => {
						console.log( 'msg', err );
					});

				}

				//视频
				if( msg.MsgType == 43 && msg.Content.String.indexOf('<') == 0 ){
							
					var fn = wx.SendForwardVideo( wxid, [ gpid ],msg.Content.String );

					fn.then( ret => {
						console.log( 'ret', ret );
					}).catch( err => {
						console.log( 'msg', err );
					});

				}

				//表情
				if( msg.MsgType == 47 && msg.Content.String.indexOf('<') == 0 ){

					var len = msg.Content.String.match(/len="(.+?)"/)[1];
					var md5 = msg.Content.String.match(/md5="(.+?)"/)[1];
							
					var fn = wx.SendForwardEmoji( wxid, [ gpid ], len, md5 );

					fn.then( ret => {
						console.log( 'ret', ret );
					}).catch( err => {
						console.log( 'msg', err );
					});

				}

				console.log( '------------------------' );

			}

		}).catch( msg => {
			console.log( msg );
		});

	/////////////////
	
}