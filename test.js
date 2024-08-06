
const Common = require('./lib/common');
const Loader = require('./lib/loader');
const Weixin = require('./lib/weixin');
const Activity = require('./lib/activity');
const Account = require('./src/account');

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

//账号
if (func == 'account') {

	let save = Common.getArgv('save', './');
	let weixin = Common.getArgv('weixin');
	let device = Common.getArgv('device');

	let klas = new Account(conf, save);
		klas.init( weixin, device );

}

//口令提取
if (func == 'password') {
	const Activity = require('./lib/activity');

	let text = Common.getArgv('text');
	let size = Common.getArgv('size');
	let word = Activity.extractTbc( text, size );

	console.log( text );
	console.log( word );

}

//发送统计
if (func == 'collect') {

	const Activity = require('./lib/activity');
	
	this.mysql = Common.mysql(conf.mysql, (db => { this.mysql = db; }).bind(this));

	let test1 = Activity.collect( this, 'moment', { 'item_id' : '123456', 'platform' : 'taobao' }, { 'created' : Common.getTime(), 'package' : '123123' }, { 'moment_chatroom' : Common.getTime() }, false );
	let test2 = Activity.collect( this, 'moment', { 'item_id' : 'E9P2xm-oFXdARqExweHdrpuRhk8R9UFN_JUJe6wFv5', 'platform' : 'taobao' }, { 'created' : Common.getTime(), 'package' : '123123' }, { '24413713211@chatroom' : Common.getTime() }, false );

	console.log( test1 );
	console.log( test2 );
}

//链接提取
if (func == 'links') {
	const Activity = require('./lib/activity');

	let text = Common.getArgv('text');
	let rule = Common.getArgv('rule');

	let link = text.match( /(https?):\/\/[-A-Za-z0-9+&@#\/%?=~_|!:,.;]+[-A-Za-z0-9+&@#\/%=~_|]/gm );
	let word = Activity.detectUrl( text, rule );

	console.dir( text );
	console.dir( link );
	console.dir( word );

}

//红包处理
if (func == 'card') {

	let klas = new GroupsSend(conf);
		klas.init();
	
	//let card = klas.parseCardMsg( { 'member_id' : 10008 }, { 'msgtype' : 80, 'cache' : 'elment', 'content' : {"title":"【饿了么外卖】第5个人领最大红包！","des":"饿了么外卖超市药店鲜花，手快有，手慢无~","thumburl":"https://assets.exp.com/.jpg"} }, console.log );

	setTimeout( () => {
		klas.sendCardMsg( { 'member_id' : 10008, 'weixin_id' : 'veryide', 'hongbao' : ['18935808677@chatroom'] }, true );
	}, 1000);	

}

//插入表情
if (func == 'emoji') {

	//插入随机表情符号
	let post = {"subject":"<TimelineObject><id>14392119216524702466</id><username>wxid_gdllaxl64pkt12</username><createTime>1715674307</createTime><contentDesc>肤感起飞！这洗脸巾好厚实🤭\n\n &#x0A;&#x0A;〰️〰️〰️</contentDesc><contentDescShowType>0</contentDescShowType><contentDescScene>0</contentDescScene><private>0</private><appInfo><id /></appInfo><contentattr>0</contentattr><sourceUserName /><sourceNickName /><statisticsData /><weappInfo><appUserName></appUserName><pagePath></pagePath><version>0</version><debugMode>0</debugMode><shareActionId></shareActionId><isGame>0</isGame><messageExtraData></messageExtraData><subType>0</subType><preloadResources></preloadResources></weappInfo><canvasInfoXml /><ContentObject><contentStyle>1</contentStyle><contentSubStyle>0</contentSubStyle><title /><description /><contentUrl /><mediaList><media><id>14392119217080251127</id><type>2</type><title /><description /><private>0</private><url md5=\"ee24c361d74e2131554c38f2968eb273\" type=\"1\">http://szmmsns.qpic.cn/mmsns/HFccPMVBP7eEpuZQ98w2ouC8pS8kuQLPmxd6x8xGZibLdbBAAsQQw9cZ3ib8gU5V3Gx86Fu9pR7JY/0</url><thumb type=\"1\">http://szmmsns.qpic.cn/mmsns/HFccPMVBP7eEpuZQ98w2ouC8pS8kuQLPmxd6x8xGZibLdbBAAsQQw9cZ3ib8gU5V3Gx86Fu9pR7JY/150</thumb><videoDuration>0.0</videoDuration><size height=\"1000\" width=\"1024\" totalSize=\"21580\" /></media><media><id>14392119217143231227</id><type>2</type><title /><description /><private>0</private><url md5=\"969323cc21fded1cfbd7751a9572af47\" type=\"1\">http://szmmsns.qpic.cn/mmsns/HFccPMVBP7eEpuZQ98w2ouC8pS8kuQLPlBPXM6GhpZ33Jgdc9OnOnWSKzjOvvdiaLMKupibNHbvuI/0</url><thumb type=\"1\">http://szmmsns.qpic.cn/mmsns/HFccPMVBP7eEpuZQ98w2ouC8pS8kuQLPlBPXM6GhpZ33Jgdc9OnOnWSKzjOvvdiaLMKupibNHbvuI/150</thumb><videoDuration>0.0</videoDuration><size height=\"934\" width=\"699\" totalSize=\"54314\" /></media><media><id>14392119217195856639</id><type>2</type><title /><description /><private>0</private><url md5=\"ca32c2b9fd590d073560c5fb203d93d3\" type=\"1\">http://szmmsns.qpic.cn/mmsns/HFccPMVBP7eEpuZQ98w2ouC8pS8kuQLPGHZiaCZv6FclfTU8R9XzuVw7sibnggUOia7l7FVogcH470/0</url><thumb type=\"1\">http://szmmsns.qpic.cn/mmsns/HFccPMVBP7eEpuZQ98w2ouC8pS8kuQLPGHZiaCZv6FclfTU8R9XzuVw7sibnggUOia7l7FVogcH470/150</thumb><videoDuration>0.0</videoDuration><size height=\"1437\" width=\"1080\" totalSize=\"74154\" /></media><media><id>14392119217224299267</id><type>2</type><title /><description /><private>0</private><url md5=\"b1efeee9c2f818bd44c07f9570702140\" type=\"1\">http://szmmsns.qpic.cn/mmsns/HFccPMVBP7eEpuZQ98w2opf79cic0BW6hIAgvsdf26JLUll7wBKLh7OZ7142dIH8jcGQ73kKSV0Q/0</url><thumb type=\"1\">http://szmmsns.qpic.cn/mmsns/HFccPMVBP7eEpuZQ98w2opf79cic0BW6hIAgvsdf26JLUll7wBKLh7OZ7142dIH8jcGQ73kKSV0Q/150</thumb><videoDuration>0.0</videoDuration><size height=\"1407\" width=\"1080\" totalSize=\"70226\" /></media><media><id>14392119217239700215</id><type>2</type><title /><description /><private>0</private><url md5=\"a812d9c7d8f7aa7e737f93aceb8e67f0\" type=\"1\">http://szmmsns.qpic.cn/mmsns/HFccPMVBP7eEpuZQ98w2opf79cic0BW6hP2SxxqFficK10uCsquyfFmPl5FmdBycK1ibHkJqicR9nro/0</url><thumb type=\"1\">http://szmmsns.qpic.cn/mmsns/HFccPMVBP7eEpuZQ98w2opf79cic0BW6hP2SxxqFficK10uCsquyfFmPl5FmdBycK1ibHkJqicR9nro/150</thumb><videoDuration>0.0</videoDuration><size height=\"933\" width=\"698\" totalSize=\"42675\" /></media><media><id>14392119217257919235</id><type>2</type><title /><description /><private>0</private><url md5=\"6f045e5ab987cc49e131976682fa334a\" type=\"1\">http://szmmsns.qpic.cn/mmsns/HFccPMVBP7eEpuZQ98w2opf79cic0BW6hg0gUEqeLahma7nyIH8WicaocFibp1OR7CDoGTHibAeCxTc/0</url><thumb type=\"1\">http://szmmsns.qpic.cn/mmsns/HFccPMVBP7eEpuZQ98w2opf79cic0BW6hg0gUEqeLahma7nyIH8WicaocFibp1OR7CDoGTHibAeCxTc/150</thumb><videoDuration>0.0</videoDuration><size height=\"1415\" width=\"1080\" totalSize=\"73633\" /></media></mediaList></ContentObject><actionInfo><appMsg><messageAction /></appMsg></actionInfo><location poiClassifyId=\"\" poiName=\"\" poiAddress=\"\" poiClassifyType=\"0\" city=\"\" /><publicUserName /><streamvideo><streamvideourl /><streamvideothumburl /><streamvideoweburl /></streamvideo></TimelineObject>","sourced":"wxid_gdllaxl64pkt12","sending":true,"convert":1,"comment":[{"exch":false,"type":2,"text":"敷益清胶原蛋白医用面膜\r\n一盒5片💰29.9亓\r\n改善皮炎痤疮，快速修复\r\n配料表很干净，专研敏肌"},{"exch":"3ObeWu8LbaB","type":2,"text":".\r\n\r\n0❤復製这条查看哦^3ObeWu8LbaB^\\/:\\/ CA0001"}],"package":"14392119216524702466","created":1715674562};
	let desc = /<contentDesc>(.+?)<\/contentDesc>/s.exec( post.subject );

	console.log( post.subject );

	if( desc && desc[1] ){
		//text.subject = text.subject.replace( desc[0], '<contentDesc>'+ Common.insertEmoji( desc[1], 3 ) +'</contentDesc>' );
		post.subject = post.subject.replace( desc[1], Common.insertEmoji( desc[1], 3 ) );
	}

	console.log( post.subject );
	
	/*
	
	const wx = require('./lib/weixin');

	this.wx = new wx(conf.weixin, conf.reserve, conf.special);

	let pm = this.wx.SnsPostXml('wxid_okvkiyguz1yh22', post.subject);

		pm.then(ret => {
			console.log( ret );
		}).catch(err => {
			console.log( err );
		});

	*/

	return;

	const Picbag = require('./picture');

	//插入随机图片
	if( /<contentStyle>1<\/contentStyle>/.test( text.subject ) && (text.subject.match( /<media>/ ) || []).length < 9 ){
		let attr = Picbag[ Common.randomPos( Picbag.length ) ];
		let data = '<media><id>14392119217080251127</id><type>2</type><title /><description /><private>0</private><url md5="'+ attr.md5 +'" type="1">'+ attr.fileurl +'</url><thumb type="1">'+ attr.thumburl +'</thumb><videoDuration>0.0</videoDuration><size height="'+ attr.height +'" width="'+ attr.width +'" totalSize="'+ attr.filelen +'" /></media>';
		text.subject = text.subject.replace( '<mediaList>', '<mediaList>' + data );
	}

	//console.log( desc );
	//console.log( text.subject );

}