
const Common = require('./lib/common');
const Loader = require('./lib/loader');
const Logger = require('./lib/logger');
const Groups = require('./src/groups');
const Moment = require('./src/moment');
const Account = require('./src/account');
const Messager = require('./src/messager');
const Heartbeat = require('./src/heartbeat');
const Forward = require('./src/forward');
const MomentSend = require('./src/moment_send');
const GroupsSend = require('./src/groups_send');
const SocketSend = require('./src/socket_send');

let conf = Common.getConf(__dirname);
let func = Common.getFunc();

const tag = Common.fileName( __filename, false );
const log = new Logger(tag);

// 清理日志;
log.clean( 5 );

process.env.UV_THREADPOOL_SIZE = 128;
console.log( '-------------' + Common.getTime() +'-------------' );

//消息推送，默认方法
if (!func || func == 'messager') {
	let test = Common.getArgv('debug');
	let klas = new Messager(conf, test);
}

//生成文件加载器
if (func == 'loader') {
	let html = Common.getArgv('html', 'index.html');
	let dist = Common.getArgv('dist', 'dist.js');

	let klas = new Loader();
		klas.init( html, dist );
}

//用户自主推送（作废）
if (func == 'forward') {
	let klas = new Forward(conf);
		klas.init();
}

//用户自主推送 (在用)
if (func == 'forward_new') {
	const ForwardNew = require('./src/forward_new');
	let klas = new ForwardNew(conf);
		klas.init();
}

//采集用户消息（作废）
if (func == 'materiel_groups') {
	const MaterielGroups = require('./src/materiel_groups');
	let klas = new MaterielGroups(conf);
		klas.init();
}

//多群消息源（在用）
if (func == 'groups_send') {
	let klas = new GroupsSend(conf);
		klas.init();
}

//群消息SW（在用）
if (func == 'socket_send') {
	let klas = new SocketSend(conf);
		klas.init();
}

//朋友圈发送（在用，先转链后发送）
if (func == 'moment_send') {
	let klas = new MomentSend(conf);
		klas.init(func);
}

//营销素材发圈（在用）
if (func == 'moment_mtl') {
	let klas = new MomentSend(conf);
		klas.init( func );
}

//营销商品发圈（作废）
if (func == 'moment') {
	let klas = new Moment(conf);
		klas.init();
}

//微信群（作废）
if (func == 'groups') {
	let item = Common.getArgv('item', 'groups');
	let klas = new Groups(conf);
		klas.init( item );
}

//云课程
if (func == 'course') {
	let item = Common.getArgv('item', 'course');
	let klas = new Course(conf);
		klas.init( item );
}

//联系人
if (func == 'contact') {

	let room = Common.getArgv('room');
	let weixin = Common.getArgv('weixin', conf.wechat);

	let klas = new Account(conf);
		klas.contact( weixin, room );

}

//心跳
if (func == 'heartbeat') {
	let klas = new Heartbeat(conf);
		klas.init();
}

// 自动登陆
if (func == 'autologin') {
	const AutoLogin = require('./src/autologin');
	let klas = new AutoLogin(conf);
		klas.init();
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

	let test1 = Activity.collect( null, 'moment', { 'item_id' : '123456', 'platform' : 'taobao' }, { 'created' : 0, 'package' : '123123' }, { 'sourced' : 'moment' }, false );
	let test2 = Activity.collect( null, 'moment', { 'item_id' : '123456', 'platform' : 'taobao' }, { 'created' : 0, 'package' : '123123' }, { 'sourced' : 'groups' }, false );

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