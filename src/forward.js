'use strict'

const fxp = require("fast-xml-parser");
const wx = require('../lib/weixin');
const com = require('../lib/common');
const req = require('../lib/request');
const act = require('../lib/activity');
const Logger = require('../lib/logger');
const Moment = require('../src/moment');
const Groups = require('../src/groups');

const tag = com.fileName(__filename, false);
const log = new Logger(tag);


class Forward {

    /**
     * 构造函数
     */
    constructor(conf) {
        this.inst = {};
        this.conf = conf;
        this.wx = new wx(conf.weixin, conf.reserve, conf.special);
        this.redis = com.redis(conf.redis);
        this.publish = com.redis(conf.redis);
        this.mysql = com.mysql(conf.mysql, (db => { this.mysql = db; }).bind(this));

        // 发圈
        this.moment = new Moment(conf);

        // 订阅锁
        this.locked = 0;

        this.queues = [];
    }

    init() {
        //订阅消息发送
        this.subscribe('mm_forward');
    }

    /**
     * 订阅消息
     * @param string 微信ID
     * @param string 消息标记
     * @param string 消息频道
     * @param object 消息过滤
     */
    async subscribe(channel) {

        let self = this;
        let wait = 1;

        this.publish.on("ready", function () {
            //订阅消息
            self.publish.subscribe(channel);
        });

        //处理 Redis 消息
        this.publish.on('message', async function (channel, message) {

            let recv = JSON.parse(message);

            // 正在读取消息，锁还未失效
            if (self.locked && self.locked >= com.getTime() - wait) {
                log.info('读消息锁', self.locked);
                return;
            } else {
                self.locked = com.getTime();
                log.info('拉取方式', { channel, message });
            }

            // 消息源，taobao 淘宝，pinduoduo拼多多
            if (recv.source) {
                self.inst.source = recv.source;
            }

            let roomids = recv.roomid ? recv.roomid : []
            let member = self.getMember(recv.weixin_id, roomids);

            member.then(data => {
                if (data.member_id == undefined) {
                    log.info('用户信息', '用户不存在或者已不再心跳有效时间');
                    return;
                }

                if (recv.type == 'groups') {
                    self.sendGroups(data, recv);
                }

                if (recv.type == 'moment') {
                    self.sendMoment(data, recv);
                }

            }).catch(err => {
                log.error(err);
            });

        });

    }

    //////////// 群消息 /////////////

    /**
     * 发送群消息
     * @param member 云发单用户信息
     * @param msg 发群消息
     */
    async sendGroups(member, msg) {
        var self = this;
        var forwardId = msg.forward_id ? msg.forward_id : 0;

        const sendGroup = this.filterGroupsMessage(member, msg);

        sendGroup.then(data => {
            self.parseMessage(member, data);

        }).catch(err => {
            self.updateForward(forwardId, '[filterGroupsMessage]方法格式化数据失败'); // 更新数据库发送信息
            log.info('消息错误', err);
        });
    }

    /**
     * 群消息格式化 
     * @param member 云发单用户信息
     * @param msg 发送消息
     */
    filterGroupsMessage(member, msg) {
        const forwardId = msg.forward_id ? msg.forward_id : 0;

        //构造数据包
        var data = {
            forwardId: forwardId,

            //需要转链
            convert: 0,

            //消息包ID
            package: msg.msgid,

            //消息列表，{ exch, msgid, msgtype, content, source }
            message: [],
        };

        for (let i = 0; i < msg.data.length; i++) {
            var item = msg.data[i];
            let text = item.content;
            let exch = item.exch;

            const type = item.msgType;
            const msgId = `${member.member_id}${Date.now()}`;
            const newMsgId = `${member.member_id}${i}${Date.now()}`;

            //不转链，文本类型，没有配置原样规则 或 文本不匹配
            if (item.msgType == 1 && (!this.inst.origin || !this.inst.origin.test(text))) {
                exch = (act.detectTbc(text) || act.detectUrl(text));
                exch && data.convert++;
            }

            data.message.push({ msgid: msgId, rowid: newMsgId, msgtype: type, content: text, source: '', product: null, exch });
        }

        return com.Promise(true, data);
    }

    /**
     * 预处理消息
     * @param object 用户数据
     * @param object 发群数据
     * @param integer 延迟时间
     */
    parseMessage(member, data, lazy_time = 0) {

        var user = com.clone(member);
        var data = com.clone(data);
        var self = this;

        //无需转链，直接回调
        if (data.convert == 0) {
            self.queues.push({ 'member': user, data });
            self.forwardMessage();
            return;
        }

        for (let i = 0; i < data.message.length; i++) {

            let comm = data.message[i];
            let exch = comm.msgtype == 1 && comm.exch;

            req.get(self.conf.convert, { 'member_id': user.member_id, 'text': comm.content, 'product': 'true', 'lazy_time': lazy_time }, (code, body) => {

                try {
                    if (typeof body == 'string') {
                        body = JSON.parse(body);
                    }
                } catch (e) {
                    body = { 'status': -code, 'body': body, 'error': e.toString() };
                }

                ///////////////

                //成功转链数量
                if (body.status > 0) {

                    //文本
                    comm.content = body.result;

                    //原始商品信息
                    comm.product = body.product;

                    //转链成功，执行回调
                    comm.exch && data.convert--;

                    if (data.convert == 0) {
                        self.queues.push({ 'member': user, data });
                        self.forwardMessage();
                    }

                } else {

                    body.err = '转链失败';
                    body.source = 'groups';
                    body.lazy_time = lazy_time;

                    if (exch) {
                        self.updateForward(data.forwardId, {err: '转链失败', text: comm.content}); // 更新数据库发送信息

                        log.info('转链失败', { 'member_id': user.member_id, body, lazy_time, 'convert': data.convert });
                    }

                    //写入延迟消息，更新发送状态
                    if (lazy_time == 0) {
                        let time = com.getTime();
                        let span = 60 * 1000 * 3;
                        self.sender = time + span;
                        setTimeout(() => { self.parseMessage(user, data, time); }, span);
                    }

                }

            }, (data) => {

                //是口令，需要转链
                if (exch && (user.tag & 4) == 0) {
                    return { 'request': true };
                } else {
                    return { 'request': false, 'respond': { 'status': 1, 'result': data.text } };
                }

            }, self.conf.options);

        }

    }

    /**
     * 转发群消息
     * @param boolean 用户末尾
     */
    forwardMessage() {

        //暂无队列
        if (this.queues.length == 0) {
            return;
        }

        /////////

        var self = this;
        let item = this.queues.shift();
        let user = item.member;
        let data = item.data;

        let sendTimes = 0;

        if (typeof user.member_id == 'undefined') {
            return log.info('异常队列', user);
        }

        log.info('当前微信', { '用户ID': user.member_id, '微信号': user.weixin_id, '群数量': user.roomid.length, '消息量': data.message.length });

        let msgLen = data.message.length;

        var func = () => {

            log.info('消息拆包', { '用户ID': user.member_id, '消息包': data.package, '待发送': data.message.length });

            let msg = data.message.shift();
            let res = self.sendMsg(user, msg);

            self.sender = com.getTime();

            res.then(ret => {

                sendTimes += 1;

                //消息包已完成
                if (data.message.length == 0) {

                    self.updateForward(data.forwardId, '群发完毕', sendTimes, msgLen); // 更新数据库发送信息

                    log.info('群发完毕', [user.member_id, data.package]);

                }

            }).catch(err => {
                self.updateForward(data.forwardId, err); // 更新数据库发送信息

                log.error('发群失败', [user.member_id, data.package, err]);

            }).finally(() => {

                //消息包未完成
                if (data.message.length > 0) {
                    setTimeout(() => { func(); }, 2500);
                }

            });

        };

        func();

    }

    /**
     * 转发群消息
     * @param object 用户信息
     * @param object 单条消息
     */
    async sendMsg(member, msg) {

        var detail = msg.content;

        //文本
        if (msg.msgtype == 1) {

            let fn = this.wx.NewSendMsg(member.weixin_id, member.roomid, detail, msg.source);

            fn.then(ret => {
                log.info('文本成功', [member.member_id, ret.count]);
            }).catch(err => {
                log.error('文本失败', err);
            });

            return fn;

        }

        //媒体
        let size = member.roomid.length;
        for (var i = 0; i < size; i++) {

            let chat = member.roomid[i];

            //图片
            if (msg.msgtype == 3) {

                var fn = this.wx.SnsUploadMsgPut(member.weixin_id, chat, detail);

                fn.then(ret => {

                    log.info('发图成功', [member.member_id, chat, ret.msgId]);

                }).catch(err => {

                    log.error('发图失败', [member.member_id, err]);

                });
            }
        }

        return fn;
    }

    //////////// 朋友圈 /////////////

    /**
     * 发送朋友圈信息
     * @param object member 用户信息
     * @param object msg 朋友圈消息
     */
    sendMoment(member, msg) {
        var self = this;

        const forwardId = msg.forward_id ? msg.forward_id : 0;

        const userName = member.weixin_id;

        const sendData = this.filterMementMessage(userName, msg);

        sendData.then(data => {

            let result = self.moment.forwardMoment(member, data);

            result.then(res => {
                self.updateForward(forwardId, '发圈成功', 1, 1);
            }).catch(err => {
                console.log('err', err);
                self.updateForward(forwardId, '发圈失败', 0, 1);
            });


        }).catch(err => {
            log.info('读取错误', err);
        });
    }

    /**
     * 过滤朋友圈消息格式
     * @param userName 微信ID
     * @param msg 朋友圈消息
     */
    async filterMementMessage(userName, msg) {
        //构造数据包
        var momentData = {
            //内容主体
            subject: "",

            //是否发送
            sending: true,

            //是否转链
            convert: true,

            //评论列表，{ exch, type, text }
            comment: msg.data.comment,

        };

        const message = msg.data.moment;

        let data = {
            "contentDesc": message.desc,
            "contentDescScene": message.scene,
            "ContentObject": {
                "contentStyle": message.style,
                "title": "",
                "description": "",
                "contentUrl": "",
                "mediaList": {}
            }
        }

        const images = message.images;
        let medias = [];

        for (let i = 0; i < images.length; i++) {

            const url = images[i];
            const wximages = await this.uploadImage(userName, url);

            if (wximages != null) {

                medias.push({
                    "id": wximages.id,
                    "type": wximages.type,
                    "title": "",
                    "description": "",
                    "private": 0,
                    "videoSize": {
                        _attrs: {
                            "width": 0,
                            "height": 0
                        },
                        "#text": ''
                    },
                    "url": {
                        _attrs: {
                            "md5": "",
                            "type": wximages.bufferUrl.type,
                            "videomd5": "",
                        },
                        "#text": wximages.bufferUrl.url
                    },
                    "thumb": {
                        _attrs: {
                            "type": wximages.thumbUrls.type,
                        },
                        "#text": wximages.thumbUrls.url
                    },
                    "size": {
                        _attrs: {
                            "width": 0,
                            "height": 0,
                            "totalSize": wximages.totalLen
                        }
                    }
                });
            }

            if (i > 0) {
                await com.sleep(400);
            }
        }

        data.ContentObject.mediaList.media = medias;

        data = this.objectToXml({ "TimelineObject": data });

        momentData.subject = data;

        return com.Promise(true, momentData);
    }

    /**
     * 上传图片到微信
     * @param string userName 微信ID
     * @param string url 图片链接
     */
    uploadImage(userName, url) {
        var self = this;
        var wxImgKey = 'wx_images_' + com.md5(url);

        return new Promise((resolve, reject) => {

            // 判断图片是否上传
            self.redis.get(wxImgKey, (err, ret) => {
                // console.log('redis ret', JSON.parse(ret));

                if (!err && ret) {
                    resolve(JSON.parse(ret));
                } else {

                    // 上传图片到微信
                    self.wx.SnsUploadPut(userName, url).then(res => {

                        // console.log('SnsUploadPut res', res);

                        if (res != null
                            && res.baseResponse.ret == "MM_OK"
                            && res.thumbUrls
                            && res.thumbUrls[0]
                            && res.bufferUrl
                            && res.thumbUrlCount > 0) {

                                const temp = {
                                    id: res.id,
                                    type: res.type,
                                    totalLen: res.totalLen,
                                    bufferUrl: res.bufferUrl,
                                    thumbUrls: res.thumbUrls[0]
                                };

                            self.redis.set(wxImgKey, JSON.stringify(temp));
                            self.redis.expire(wxImgKey, 3600 * 24 * 7);

                            resolve(temp);
                            return;
                        }

                        log.info('上传图片失败', [userName, url, res]);
                        resolve(null);
                    }).catch(err => {

                        log.info('上传图片错误', [userName, url, err]);
                        resolve(null);

                    });
                }
            });
        })
    }

    //////////// 辅助方法 /////////////

    /**
     * 获取用户信息
     * @param int member_id
     * @return array
     */
    getMember(weixin_id, roomidList = []) {

        var self = this;

        return new Promise((resolve, reject) => {

            //昨天时间
            var last = com.strtotime('-1 day');
            var date = new Date(last * 1000).format('yyyyMMdd');
            //二十分钟
            var time = com.getTime() - self.conf.active;

            const sql = 'SELECT auto_id, member_id, weixin_id, groups_list, moment, groups, tag FROM `pre_weixin_list` WHERE weixin_id = ? AND created_date <= ? AND heartbeat_time >= ? LIMIT 1';

            self.mysql.query(sql, [weixin_id, date, time], function (err, res) {
                if (err) {
                    log.error(err);
                    reject(err);
                    return;
                }

                if (res.length == 1) {
                    res = res[0];

                    res.roomid = [];

                    if (res.groups_list) {
                        let groups = JSON.parse(res.groups_list);

                        groups = groups.filter(ele => {
                            if (roomidList.length == 0 || (roomidList.length > 0 && roomidList.indexOf(ele.userName) > -1)) {
                                return ele.userName;
                            }
                        });

                        //提取群ID
                        res.roomid = groups.map(ele => {
                            return ele.userName;
                        });
                    } else {
                        res.roomid = roomidList;
                    }
                }

                resolve(res);
            })
        })
    }

    /**
     * 对象 转 xml
     * @param object 对象
     */
    objectToXml(object) {
        const options = {
            format: false,
            attrNodeName: "_attrs",
            textNodeName: "#text"
        };
        return new fxp.j2xParser(options).parse(object);
    }

    /**
     * 更新发单效果
     * @param string res 发送结果
     */
    updateForward(forwardId, res, sendTimes = 0, msgLen = 0) {
        const resMsg = typeof res == 'string' ? res : JSON.stringify(res);

        log.info('发单更新', [forwardId, resMsg, sendTimes, msgLen]);

        if (forwardId > 0) {

            let status = 0;

            if (sendTimes > 0 && sendTimes == msgLen) {
                status = 2;
            } else if (sendTimes > 0 && sendTimes < msgLen) {
                status = 1;
            } else if (sendTimes == 0) {
                status = -1;
            }

            this.mysql.query('UPDATE `pre_weixin_forward` SET send_res = ?, send_time = UNIX_TIMESTAMP(), send_count = ? , status = ? WHERE id = ?', [ resMsg, sendTimes, status, forwardId ] );
        }
    }

}


module.exports = Forward;