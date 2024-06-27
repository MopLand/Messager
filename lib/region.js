'use strict'

/**
 * 微信客户端类
 */

const Common = require('../lib/common');
const Logger = require('../lib/logger');
const Request = require('../lib/request');
const Act = require('../lib/activity');
const tag = Common.fileName( __filename, false );
const log = new Logger( tag );

class Weixin {
	
	/**
	 * 后端负载数量（子服务器，不含主服务器）
	 */
	static serv = 12;

	/**
	 * 构造函数
	 * @param string 主要 API
	 * @param string 备用 API
	 * @param regexp 特殊用户
	 */
	constructor( host, reserve, special ) {
		this.inst = -1;
		this.devi = '';
		this.host = host;
		this.reserve = reserve;
		this.special = special;
	}

	/**
	 * GET 请求
	 * @param string API地址
	 * @param object 参数
	 * @param function 校验方法
	 */
	get(api, arg, valid) {
		return this.request( 'get', api, arg, valid );
	}

	/**
	 * PUT 请求
	 * @param string API地址
	 * @param object 参数
	 * @param function 校验方法
	 */
	put(api, arg, valid) {
		return this.request( 'put', api, arg, valid );
	}

	/**
	 * POST 请求
	 * @param string API地址
	 * @param object 参数
	 * @param function 校验方法
	 */
	post(api, arg, valid) {
		return this.request( 'post', api, arg, valid );
	}

	/**
	 * 请求分流标记
	 * @param integer 用户ID
	 * @param string 设备ID
	 */
	instance( userid, device ) {
		this.inst = userid % Weixin.serv;
		this.devi = device;
		return this;
	}

	/**
	 * Request 请求回调
	 * @param string 请求方式
	 * @param string API地址
	 * @param object 参数
	 * @param function 校验方法
	 */
	request(method, api, arg, valid = null ) {

		var self = this;
		var host = self.host;
		
		//特殊用户通道
		if( self.reserve && self.special && self.special.test( api ) ){
			host = self.reserve;
		}

		var url = host + api + ( api.indexOf('?') > -1 ? '&' : '?' ) + 'instance=' + self.inst;

		var valid = valid ? valid : ( code, body ) => {
			if( code == 200 && body.baseResponse && ( body.baseResponse.ret == 'MM_OK' || body.baseResponse.ret == 'MMSNS_RET_ISALL' ) ){
				return body;
			}
		}

		if( method == 'post' ){
			arg['deviceId'] = this.devi;
		}else{
			url += '&deviceId=' + this.devi;
		}

		return new Promise(function (resolve, reject) {
				
			//console.log( url, arg );

			Request[method](url, arg, ( code, body ) => {
				
				//console.log( code, url, body );

				if (typeof body == 'string') {
					//var text = body.replace(/:([0-9]{15,}),/g, ':"$1",');
					try {
						body = JSON.parse(body);
					} catch( e ){
						body = { 'code' : code, 'message' : body, 'instance' : self.inst, 'error' : e.toString() };
					} 
				}

				var data = null;

				if ( data = valid( code, body ) ) {

					resolve(data);

				} else {

					var err = body.message || body.errMsg;

					if( !err && body.baseResponse ){
						err = JSON.stringify( body.baseResponse.errMsg ) != '{}' ? ( body.baseResponse.errMsg.string || body.baseResponse.errMsg ) : body.baseResponse.ret;
					}

					if( typeof err == 'string' && /<!\[CDATA\[(.+?)\]\]>/.test( err ) ){
						err = /<!\[CDATA\[(.+?)\]\]>/.exec( err )[1];
					}

					reject( err );
					log.error( method, { 'request' : api, 'querys' : arg, 'instance' : self.inst, 'response' : body, 'server' : host, 'error' : err } );
				}

			});

		});
		
	}

	/**
	 * AutoAuth 自动提交登陆 
	 * @param string 微信用户ID
	 */
	AutoAuth(userName) {
		var api = 'login/autoauth?' + Common.buildReq( { userName } );
		var ret = { };
		return this.get(api, ret);
	}

	/**
	 * 心跳 
	 * @param string 微信用户ID
	 */
	Heartbeat(userName) {
		var api = 'login/heartbeat?' + Common.buildReq( { userName } );
		var ret = { };
		return this.get(api, ret);
	}

	/**
	 * GetLoginQrCode 获取登陆二维码
	 * @param string deviceID 设备ID，可以为空，为空的时候则创建新的设备
	 */
	GetLoginQrCode(deviceId = '') {
		var api = 'local/getloginqrcode?' + Common.buildReq( { deviceId } );
		var ret = { };
		return this.get(api, ret);
	}

	/**
	 * CheckLogin 检查是否登陆 
	 * @param string uuid UUid
	 */
	CheckLogin(uuid) {
		var api = 'local/checkloginqrcode?' + Common.buildReq( { uuid } );
		var ret = { };
		return this.get(api, ret);
	}

	/**
	 * 通知手机确认登陆
	 * @param string 微信用户ID 
	 */
	PushLoginUrl(userName) {
		var api = 'local/pushloginurl?' + Common.buildReq( { userName } );
		var ret = { };
		return this.get(api, ret);
	}

	/**
	 * ManualAuth 手动提交登陆
	 * @param string 微信用户ID 
	 */
	ManualAuth(userName) {
		var api = 'local/manualauth?' + Common.buildReq( { userName } );
		var ret = { };
		return this.post(api, ret);
	}

	/**
	 * 获取微信账号信息 
	 * @param string 微信用户ID 
	 */
	GetProfile(userName) {
		var api = 'info/getprofile?' + Common.buildReq( { userName } );
		var ret = { };
		return this.get(api, ret);
	}

	/**
	 * 获取通讯录 
	 * @param string userName 微信Id
	 * @param integer 联系人偏移量，可传999999999，只取群
	 * @param integer 微信群偏移量
	 */
	InitContact(userName, currentWxcontactSeq = 0, currentChatRoomContactSeq = 0 ) {
		var api = 'contact/initcontact?' + Common.buildReq( { userName } );
		var ret = { currentWxcontactSeq, currentChatRoomContactSeq };
		return this.post(api, ret);
	}

	/**
	 * 获取通讯录 
	 * @param string userName 微信Id
	 * @param string body 好友ID
	 */
	GetContact(userName, body = [] ) {
		var api = 'contact/getcontact?' + Common.buildReq( { userName } );
		var ret = { body };
		return this.post(api, ret);
	}

	/**
	 * 获取通讯录 
	 * @param string userName 微信Id
	 * @param string body 微信群ID
	 */
	GetChatroomMemberDetail(userName, chatroomUserName ) {
		var api = 'contact/getchatroommemberdetail?' + Common.buildReq( { userName } );
		var ret = { chatroomUserName };
		return this.post(api, ret);
	}

	/**
	 * 同步消息  
	 * @param string userName 微信Id
	 * @param string keyBuf 上一次返回的keyBuf
	 * @param integer selector
	 * @param integer scene
	 */
	NewSync(userName, keyBuf = '', selector = 2, scene = 1) {
		var api = 'message/newsync?' + Common.buildReq( { userName } );
		var ret = { selector, scene, keyBuf };
		return this.post(api, ret, (code, body) => {
			if( code == 200 ){
				return body
			}
		} );
	}

	/**
	 * 发送文本信息
	 * @param string wxId 微信Id
	 * @param array toWxIds 发送的微信ID
	 * @param string content 发送内容
	 * @param string msgSource 消息来源
	 * @param integer type 内容类型
	 */
	NewSendMsg(userName, toUserName, content, msgSource = '', type = 1 ) {
		var api = 'message/newsendmsg?' + Common.buildReq( { userName } );
		var ret = [];

		if( typeof toUserName != 'object' ){
			toUserName = [ toUserName ];
		}

		for( let i = 0; i < toUserName.length; i++ ){

			if (!content || content == '') {
				log.info('空消息', {userName, toUserName: toUserName[i], content: content});
				continue;
			}

			ret.push( { content, type, msgSource, 'toUserName' : toUserName[i] } );
		}

		return this.post(api, ret);
	}

	/**
	 * 发送emoji表情 XML
	 * @param string wxId 微信Id
	 * @param array toWxIds 发送的微信ID
	 * @param string content 发送内容  必填True
	 * @param string msgSource 消息来源
	 */
	SendEmojiXml(userName, toUserName, content, msgSource = '' ) {
		var api = 'message/sendemoji?' + Common.buildReq( { userName } );
		var ret = { toUserName, content, msgSource };
		return this.post(api, ret);
	}

	/**
	 * 发送图片消息 XML
	 * @param string wxId 微信Id
	 * @param array toWxIds 发送的微信ID
	 * @param string content 发送内容  必填True
	 */
	UploadMsgImgXml(userName, toUserName, content, msgSource = '' ) {
		var api = 'message/sendimg?' + Common.buildReq( { userName } );
		var ret = { toUserName, content, msgSource };
		return this.post(api, ret);
	}

	/**
	 * 发送视频消息 XML
	 * @param string wxId 微信Id
	 * @param array toWxIds 发送的微信ID
	 * @param string content 发送内容  必填True
	 */
	UploadVideoXml(userName, toUserName, content, msgSource = '' ) {
		var api = 'message/uploadvideo?' + Common.buildReq( { userName } );
		var ret = { toUserName, content, msgSource };
		return this.post(api, ret);
	}

	/**
	 * 发送AppMsg消息 XML
	 * @param string wxId 微信Id
	 * @param array toWxIds 发送的微信ID
	 * @param string content 发送内容  必填True
	 * @param string msgSource 消息来源
	 */
	SendAppMsgXml(userName, toUserName, content, msgSource = '' ) {
		var api = 'message/sendappmsg?' + Common.buildReq( { userName } );
		var ret = { toUserName, content, msgSource };
		return this.post(api, ret);
	}

	/**
	 * 获取指定人朋友圈
	 * @param string wxId 微信Id
	 * @param string 朋友圈好友的wxid
	 * @param string 上次返回列表的最大id，用于分页
	 */
	SnsUserPage(userName, toUserName, maxId = 0, source = 0) {
		var api = 'sns/mmsnsuserpage?' + Common.buildReq( { userName } );
		var ret = { userName: toUserName, maxId, source };
		return this.post(api, ret);
	}

	/**
	 * 发送朋友圈 XML
	 * @param string wxId 微信Id
	 * @param string content 发送内容  必填True
	 */
	SnsPostXml(userName, content ) {
		var api = 'sns/mmsnspost?' + Common.buildReq( { userName } );
		var ret = { content };
		return this.post(api, ret);
	}

	/**
	 * 发送评论&点赞  
	 * @param string wxId 微信Id
	 * @param integer id 朋友圈Id
	 * @param integer type 类型 1点赞 2：文本 3:消息 4：with 5陌生人点赞
	 * @param string content 内容
	 * @param string toUsername 回复谁的评论
	 * @param integer replyCommnetId 回复评论Id
	 */
	SnsComment(userName, id, type = 0, content = '', toUsername = '', replyCommnetId = '0') {
		var api = 'sns/mmsnscomment?' + Common.buildReq( { userName } );
		var ret = { id, currentAction : { 'toUsername' : toUsername || userName, type, content, replyCommnetId } };

		/*
		ret.currentAction = Common.filter( ret.currentAction, val => {
			return val != '0';
		} );
		*/
		
		/*
		if( !type ){
			delete ret.currentAction.type;
		}

		if( !replyCommnetId ){
			delete ret.currentAction.replyCommnetId;
		}
		
		if( !toUsername ){
			delete ret.currentAction.toUsername;
		}
		*/

		return this.post(api, ret);
	}

	/**
	 * 朋友圈操作 
	 * @param string wxId 微信Id
	 * @param integer 朋友圈ID
	 * @param integer 操作类型：1 删除，2 隐私，5 取消点赞
	 */
	SnsObjectOp(userName, ids, opType) {
		var api = 'sns/mmsnsobjectop?' + Common.buildReq( { userName } );
		var ret = [];

		if( typeof ids != 'object' ){
			ids = [ ids ];
		}

		for( let i = 0; i < ids.length; i++ ){
			ret.push( { opType, 'id' : ids[i] } );
		}

		return this.post(api, ret);
	}

}

module.exports = Weixin;