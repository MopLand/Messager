'use strict'

/**
 * 微信客户端类
 */

const Common = require('../lib/common');
const Request = require('../lib/request');

class Weixin {

    /**
     * 构造函数
     */
	constructor(host) {
		this.host = host;
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
     * Request 请求回调
     * @param string 请求方式
     * @param string API地址
     * @param object 参数
     * @param function 校验方法
     */
	request(method, api, arg, valid = null ) {

		var self = this;
		var url = self.host + api;

		var valid = valid ? valid : ( code, body ) => {
			if( code == 200 && body.baseResponse && body.baseResponse.ret == 'MM_OK' ){
				return body;
			}
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
						body = { 'code' : code, 'message' : body, 'error' : e.toString() };
					} 
				}

				var data = null;

				if ( data = valid( code, body ) ) {
					resolve(data);
				} else {
					reject(body.message || body.errMsg || ( body.baseResponse ? body.baseResponse.errMsg : body ) );
				}

			 });
		});
		
	}

    /**
     * GetLoginQrCode 获取登陆二维码
     * @param string deviceID 设备ID，可以为空，为空的时候则创建新的设备
     */
	GetLoginQrCode(deviceId = '') {
		var api = 'wechat/getloginqrcode?' + Common.buildReq( { deviceId } );
		var ret = { };
		return this.get(api, ret);
	}

    /**
     * CheckLogin 检查是否登陆 
     * @param string uuid UUid
     */
	CheckLogin(uuid) {
		var api = 'wechat/checkloginqrcode?' + Common.buildReq( { uuid } );
		var ret = { };
		return this.get(api, ret);
	}

    /**
     * CheckLogin 检查是否登陆 
     * @param string 微信用户ID 
     */
	ManualAuth(userName) {
		var api = 'wechat/manualauth?' + Common.buildReq( { userName } );
		var ret = { };
		return this.post(api, ret);
	}

    /**
     * 通知手机确认登陆
     * @param string 微信用户ID 
     */
	PushLoginUrl(userName) {
		var api = 'wechat/pushloginurl?' + Common.buildReq( { userName } );
		var ret = { };
		return this.get(api, ret);
	}

    /**
     * 获取微信账号信息 
     * @param string 微信用户ID 
     */
	GetProfile(userName) {
		var api = 'wechat/getprofile?' + Common.buildReq( { userName } );
		var ret = { };
		return this.get(api, ret);
	}

    /**
     * 心跳 
     * @param string 微信用户ID
     */
	Heartbeat(userName) {
		var api = 'wechat/heartbeat?' + Common.buildReq( { userName } );
		var ret = { };
		return this.post(api, ret);
	}

    /**
     * 获取通讯录 
     * @param string userName 微信Id
     * @param integer 联系人偏移量，可传999999999，只取群
     * @param integer 微信群偏移量
     */
	InitContact(userName, currentWxcontactSeq = 0, currentChatRoomContactSeq = 0 ) {
		var api = 'wechat/initcontact?' + Common.buildReq( { userName } );
		var ret = { currentWxcontactSeq, currentChatRoomContactSeq };
		return this.post(api, ret);
	}

    /**
     * 获取通讯录 
     * @param string userName 微信Id
     * @param string body 好友ID
     */
	GetContact(userName, body = [] ) {
		var api = 'wechat/getcontact?' + Common.buildReq( { userName } );
		var ret = { body };
		return this.post(api, ret);
	}

    /**
     * 获取通讯录 
     * @param string userName 微信Id
     * @param string body 微信群ID
     */
	GetChatroomMemberDetail(userName, chatroomUserName ) {
		var api = 'wechat/getchatroommemberdetail?' + Common.buildReq( { userName } );
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
		var api = 'wechat/newsync?' + Common.buildReq( { userName } );
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
	NewSendMsg(userName, toUserName, content, msgSource = '', type = 1) {
		var api = 'wechat/newsendmsg?' + Common.buildReq( { userName } );
		var ret = [];

		if( typeof toUserName != 'object' ){
			toUserName = [ toUserName ];
		}

		for( let i = 0; i < toUserName.length; i++ ){
			ret.push( { content, type, msgSource, 'toUserName' : toUserName[i] } );
		}

		return this.post(api, ret);
	}

	/**
     * 发送emoji表情
     * @param string wxId 微信Id
     * @param array toWxIds 发送的微信ID
     * @param string content 发送内容  必填True
     */
	SendEmoji(userName, toUserName, md5, totalLen, type = 0, externXml = '' ) {
		var api = 'wechat/sendemoji?' + Common.buildReq( { userName } );
		var ret = { toUserName, md5, totalLen, type, externXml };
		return this.post(api, ret);
	}

	/**
     * 发送emoji表情 XML
     * @param string wxId 微信Id
     * @param array toWxIds 发送的微信ID
     * @param string content 发送内容  必填True
     */
	SendEmojiXml(userName, toUserName, msgXml ) {
		var api = 'wechat/sendemoji?' + Common.buildReq( { userName } );
		var ret = { toUserName, msgXml };
		return this.put(api, ret);
	}

	/**
     * 发送图片消息
     * @param string wxId 微信Id
     * @param array toWxIds 发送的微信ID
     * @param string content 发送内容  必填True
     */
	UploadMsgImg(userName, toUserName, totalLen, cdnbigImgUrl, cdnmidImgUrl, aeskey, encryVer, cdnbigImgSize, cdnmidImgSize, cdnthumbImgUrl, cdnthumbImgSize, cdnthumbImgHeight, cdnthumbImgWidth ) {
		var api = 'wechat/uploadmsgimg?' + Common.buildReq( { userName } );
		var ret = { toUserName, totalLen, cdnbigImgUrl, cdnmidImgUrl, aeskey, encryVer, cdnbigImgSize, cdnmidImgSize, cdnthumbImgUrl, cdnthumbImgSize, cdnthumbImgHeight, cdnthumbImgWidth };
		return this.post(api, ret);
	}

	/**
     * 发送图片消息 XML
     * @param string wxId 微信Id
     * @param array toWxIds 发送的微信ID
     * @param string content 发送内容  必填True
     */
	UploadMsgImgXml(userName, toUserName, msgXml ) {
		var api = 'wechat/uploadmsgimg?' + Common.buildReq( { userName } );
		var ret = { toUserName, msgXml };
		return this.put(api, ret);
	}

	/**
     * 发送视频消息
     * @param string wxId 微信Id
     * @param array toWxIds 发送的微信ID
     * @param string content 发送内容  必填True
     */
	UploadVideo(userName, toUserName, thumbTotalLen, videoTotalLen, playLength, cdnvideoUrl, aeskey, encryVer, cdnthumbUrl, cdnthumbImgSize, cdnthumbImgHeight, cdnthumbImgWidth, cdnthumbAeskey ) {
		var api = 'wechat/uploadvideo?' + Common.buildReq( { userName } );
		var ret = { toUserName, thumbTotalLen, videoTotalLen, playLength, cdnvideoUrl, aeskey, encryVer, cdnthumbUrl, cdnthumbImgSize, cdnthumbImgHeight, cdnthumbImgWidth, cdnthumbAeskey };
		return this.post(api, ret);
	}

	/**
     * 发送视频消息 XML
     * @param string wxId 微信Id
     * @param array toWxIds 发送的微信ID
     * @param string content 发送内容  必填True
     */
	UploadVideoXml(userName, toUserName, msgXml ) {
		var api = 'wechat/uploadvideo?' + Common.buildReq( { userName } );
		var ret = { toUserName, msgXml };
		return this.put(api, ret);
	}

	/**
     * 发送AppMsg消息
     * @param string wxId 微信Id
     * @param array toWxIds 发送的微信ID
     * @param string content 发送内容  必填True
     */
	SendAppMsg(userName, toUserName, appId, sdkVersion, type, shareUrlOriginal, shareUrlOpen, content ) {
		var api = 'wechat/sendappmsg?' + Common.buildReq( { userName } );
		var ret = { toUserName, appId, sdkVersion, type, shareUrlOriginal, shareUrlOpen, content };
		return this.post(api, ret);
	}

	/**
     * 发送AppMsg消息 XML
     * @param string wxId 微信Id
     * @param array toWxIds 发送的微信ID
     * @param string content 发送内容  必填True
     */
	SendAppMsgXml(userName, toUserName, msgXml ) {
		var api = 'wechat/sendappmsg?' + Common.buildReq( { userName } );
		var ret = { toUserName, msgXml };
		return this.put(api, ret);
	}


    /**
     * 获取指定人朋友圈
     * @param string wxId 微信Id
     * @param string 朋友圈好友的wxid
     * @param string 上次返回列表的最大id，用于分页
     */
	SnsUserPage(userName, toUserName, maxId = 0, source = 0) {
		var api = 'wechat/mmsnsuserpage?' + Common.buildReq( { userName } );
		var ret = { userName: toUserName, maxId, source };
		return this.post(api, ret);
	}

    /**
     * 发送朋友圈 
     * @param string wxId 微信Id
     * @param integer 除文本=3外，其他都为0
     * @param string content 朋友圈文本内容
     * @param string title 标题  文本=2 图片=1 视频=15 链接=3
     * @param string contentUrl 内容的链接  必填False 
     * @param string description 描述  必填False 
     * @param array mediaInfos media列表  必填False
     */
	SnsPost(userName, contentDescScene, contentDesc = '', contentStyle = 2, title = '', description = '', contentUrl = '', mediaList = []) {
		var api = 'wechat/mmsnspost?' + Common.buildReq( { userName } );
		var ret = { contentDescScene, contentDesc, contentStyle, title, description, contentUrl, mediaList };
		return this.post(api, ret);
	}

	/**
     * 发送朋友圈 XML
     * @param string wxId 微信Id
     * @param string content 发送内容  必填True
     */
	SnsPostXml(userName, objectDesc ) {
		var api = 'wechat/mmsnspost?' + Common.buildReq( { userName } );
		var ret = { objectDesc };
		return this.put(api, ret);
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
	SnsComment(userName, id, type = 0, content = '', toUsername = '', replyCommnetId = 0) {
		var api = 'wechat/mmsnscomment?' + Common.buildReq( { userName } );
		var ret = { id, currentAction : { toUsername, type, content, replyCommnetId } };

		ret.currentAction = Common.filter( ret.currentAction, val => {
			return val;
		} );
		
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
		var api = 'wechat/mmsnsobjectop?' + Common.buildReq( { userName } );
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