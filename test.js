
const System = require('./lib/system');
const Weixin = require('./lib/weixin');

let conf = System.getConf( __dirname );
let step = System.getArgv( 'step' );

//var wx = new Weixin( 'http://180.97.238.53:5432/api/' );
var wx = new Weixin( 'http://localhost:62677/api/' );

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
	let type = System.getArgv( 'type', 0 );
	let content = System.getArgv( 'content' );

	console.log( content );

	var fn = wx.SendFriendCircle( wxid, type, content );

		fn.then( ret => {
			console.log( ret );
		}).catch( msg => {
			console.log( msg );
		});

}

if( step == 'getpop' ){

	let wxid = System.getArgv( 'wxid' );
	let toWxId = System.getArgv( 'toWxId', 'wxid_ig5bgx8ydlbp22' );
	let maxid = System.getArgv( 'maxid', 0 );

	var fn = wx.GetFriendCircleDetail( wxid, toWxId, maxid );

		fn.then( posts => {
			
			//console.log( ret.ObjectList[0] );
			let post = posts.ObjectList[6];
			//let body = System.parseXml( post.objectDesc.buffer );

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

if( step == 'group' ){

	let wxid = System.getArgv( 'wxid' );
	let text = System.getArgv( 'text', '好' );

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

if( step == 'syncmsg' ){

	let wxid = System.getArgv( 'wxid' );
	let gpid = System.getArgv( 'gpid' );

	var fn = wx.SyncMessage( wxid );

		fn.then( ret => {
			//console.log( ret );

			var group_id = '';

			var msgs = filter( ret.AddMsgs, { ToUserName : gpid, FromUserName : wxid } );

			/////////////

			console.log( 'msgs', msgs );
			console.log( '------------------------' );

			for( let i = 0; i < msgs.length; i++ ){

				var msg = msgs[i];

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

				if( msg.Content.String.indexOf('<') == 0 ){

					var fn = wx.SendXmlMessage( wxid, [ gpid ], msg.Content.String );

					fn.then( ret => {
						console.log( ret );
					}).catch( msg => {
						console.log( msg );
					});
				}

				console.log( '------------------------' );

			}

		}).catch( msg => {
			console.log( msg );
		});

	/////////////////

}