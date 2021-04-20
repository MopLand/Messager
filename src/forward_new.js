'use strict'

const fxp = require("fast-xml-parser");
const wx = require('../lib/weixin');
const com = require('../lib/common');
const req = require('../lib/request');
const act = require('../lib/activity');
const Logger = require('../lib/logger');
const Moment = require('./moment');
const GroupsSend = require('./groups_send');

const tag = com.fileName(__filename, false);
const log = new Logger(tag);


class ForwardNew {

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

        // 订阅锁
        this.locked = 0;

        this.message = [];
        this.queues = [];
    }

    init() {
        this.moment = new Moment(this.conf);
        this.groups = new GroupsSend(this.conf);

        //订阅消息发送
        this.subscribe('mm_forward_new');
    }

    /**
     * 订阅消息
     * @param {String} channel 订阅通道
     */
    subscribe(channel) {

        let self = this;
        let wait = 1; // 等待时间

        this.publish.on("ready", function () {
            //订阅消息
            self.publish.subscribe(channel);
        });

        //处理 Redis 消息
        this.publish.on('message', function (channel, msg) {

            // 正在读取消息，锁还未失效
            if (self.locked && self.locked >= com.getTime() - wait) {
                log.info('读消息锁', self.locked);
                return;
            } else {
                self.locked = com.getTime();
                log.info('拉取方式', { channel, msg });
            }

            try {
                msg = JSON.parse(msg);
            } catch (e) {
                msg = log.error('消息错误', { channel, msg });
            }

            self.getMember(msg);
        });
    }

    ////////////// 处理消息 ////////////

    /**
     * 获取用户信息
     */
    getMember(msg) {
        var self = this;

        let member = msg.member;

        //昨天时间
        var last = com.strtotime('-1 day');
        var date = new Date(last * 1000).format('yyyyMMdd');

        let field = 'w.auto_id, w.member_id, w.weixin_id, w.groups_list,w. moment, w.groups, w.tag, m.`invite_code`';
        let sql = 'SELECT ' + field + ' FROM `pre_weixin_list` AS w LEFT JOIN `pre_member_list` AS m ON w.`member_id` = m.`member_id` WHERE w.created_date <= ? AND w.online = 1';
        let req = [date];

        if (member.member_id) {
            sql += ' AND w.member_id = ? ';
            req.push(member.member_id);
        }

        if (member.weixin_id) {
            sql += ' AND w.weixin_id IN (?) ';
            req.push(member.weixin_id);
        }

        self.mysql.query(sql, req, function (err, res) {

            if (err) return log.error('用户错误', err);

            if (res.length == 0) return log.error('用户为空', err);

            if (msg.type == 'moment') {
                self.sendMomentMessage(res, msg.data, msg.rawdata);
                return log.info('发送发圈', [res, msg.data, msg.rawdata]);
            }

            if (msg.type == 'groups') {
                res = self.filterMemberGroups(res, msg.platform, msg.roomids);

                if (res.length == 0) {
                    return log.info('发送失败', [res, msg.data, msg.rawdata]);
                }

                self.sendGroupsMessage(msg.msgid, res, msg.data);
                return log.info('发送发群', [res, msg]);
            }

        })

    }

    /**
     * 处理用户
     */
    filterMemberGroups(res, platform, roomids) {

        var member = [];

        for (let i = 0; i < res.length; i++) {

            let groups = JSON.parse(res[i].groups_list);

            groups = groups.filter(ele => {
                let on = true; //ele.switch == undefined || ele.switch == 1 ? true : false;
                let mini = true;
                let url = true;

                let isroom = roomids ? (roomids.indexOf(ele.userName) > -1) : true; // 是否在选中的群里面
                let isstatus = platform ? (ele.status.indexOf(platform) > -1) : true; // 是否符合发群类型

                if (isroom && isstatus && on && (mini || url)) {
                    ele.mini = mini; // 小程序 (针对拼多多)
                    ele.url = url; // 链接 (针对拼多多)
                    return ele;
                }
            });

            // 返回有用信息
            var roomidInfo = groups.map(ele => {
                return {
                    roomid: ele.userName,
                    mini: ele.mini,
                    url: ele.url,
                };
            });

            // 返回有用信息
            var roomidInfo = groups.map(ele => {
                return {
                    roomid: ele.userName,
                    mini: ele.mini,
                    url: ele.url,
                };
            });

            if (roomidInfo.length > 0) {
                member.push({ member_id: res[i].member_id, weixin_id: res[i].weixin_id, tag: res[i].tag, roomidInfo });
            }
        }

        log.info('筛选用户', '符合用户 ' + member.length);

        return member;
    }

    //////////// 发送朋友圈消息 ////////////

    /**
     * 发送朋友圈消息
     * @param {Object} user 用户信息
     * @param {Object} data 发圈信息
     */
    sendMomentMessage(user, data, rawdata = false) {

        this.filterMementMessage(data, user[0].weixin_id, rawdata, (res) => {

            for (let i = 0; i < user.length; i++) {
                this.moment.forwardMoment(user[i], res);
            }

        })
    }

    /**
     * 过滤朋友圈消息格式
     * @param {Object} msg 朋友圈消息
     * @param {String} userName 微信ID
     */
    async filterMementMessage(msg, userName, rawdata = false, func) {

        if (rawdata) {
            let post = {
                objectDesc: {
                    string: msg.moment
                },
                commentUserList: msg.comments,
                commentUserListCount: msg.comments.length,
            }

            func(this.moment.parseMoment(post));
            return;
        }

        //构造数据包
        var momentData = {
            subject: "", //内容主体
            sending: true, //是否发送
            convert: true, //是否转链
            comment: this.checkComment(msg.comments), //评论列表，{ exch, type, text }

        };

        let message = msg.moment;
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

        let images = message.images;
        let medias = [];

        for (let i = 0; i < images.length; i++) {

            let url = images[i];
            let wximages = await this.uploadImage(userName, url);

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

        if (medias.length == 0) {
            func(null);
            return;
        }

        data.ContentObject.mediaList.media = medias;

        data = this.objectToXml({ "TimelineObject": data });

        momentData.subject = data;

        func(momentData);
    }

    /**
     * 检测评论是否转链
     * @param {Object}} comment 
     * @returns 
     */
    checkComment(comment) {
        if (comment.length == 0) {
            return comment
        }

        for (let i = 0; i < comment.length; i++) {
            let item = comment[i];

            item.exch = act.detectTbc( item.text ) || act.detectUrl( item.text );

            comment[i] = item;
        }

        return comment;
    }

    //////////// 发送群消息 ////////////

    /**
     * 发送群消息
     */
    sendGroupsMessage(msgid, user, data) {

        var self = this;
        //获取用户副本，限定每分钟发送量，并计算每人所需间隔时间
        var size = user.length;
        var mins = size / 500;
        var span = (mins * 60 * 1000) / size;

        data = self.filterMessage(msgid, data);

        var func = (i) => {

            //预处理消息
            self.groups.parseMessage(user[i], data);

            //开始发消息
            //if( i > 0 ){
            //	self.forwardMessage( i == size - 1 );
            //}

            //下一下用户
            if (i < size - 1) {
                setTimeout(() => { func(i + 1); }, span);
            }

            //本地测试，单用户
            if (size == 1) {
                setTimeout(self.groups.forwardMessage.bind(self), span);
            }

        }

        //开始执行
        func(0);

    }

    /**
     * 消息过滤器
     * @param string 消息包ID
     * @param object 消息数据
     * @param object 过滤条件
     * @param integer 返回数据，-1 全返回，1 仅返回单条
     */
    filterMessage(pakId, msgs, where = {}, limit = -1) {

        //构造数据包
        var data = {

            //需要转链
            convert: 0,

            //消息包ID
            package: pakId,

            //消息列表，{ exch, msgid, msgtype, content, source }
            message: [],
        };

        for (let i = 0; i < msgs.length; i++) {

            var size = 0;
            var item = msgs[i];
            let text = item.content;

            //撤回消息，查找之前的 rowid 并过滤掉 
            if (item.msgType == 10002) {

                let rawid = com.match(text, /<newmsgid>(.+?)<\/newmsgid>/, 1);

                if (rawid) {

                    log.info('撤回消息', { 'rawid': rawid, 'text': text });

                    data.message = data.message.filter(ele => {
                        return ele.rowid != rawid;
                    });

                }

            }

            //支持的消息类型：1 文字、3 图片、43 视频、47 表情、49 小程序
            if ([1, 3, 43, 47, 49].indexOf(item.msgType) == -1) {
                continue;
            }

            for (let w in where) {

                switch (w) {

                    //谁说的活
                    case 'speaker':
                        size += text.indexOf(where[w]) === 0 ? 1 : 0;
                        break;

                    //允许的文本
                    case 'allowed':
                        size += (item.msgType != 1 || where[w].test(text)) ? 1 : 0;
                        break;

                    //其他字段
                    default:
                        size += (item[w].string == where[w]) ? 1 : 0;
                        break;

                }

            };

            //群消息，过滤 xxx:\n
            // if (/@chatroom$/.test(item.fromUserName.string)) {
            //     text = text.replace(/^[0-9a-zA-Z_\-]{1,}:\n/, '');
            // }

            //小程序，过滤 mmlive
            if (/<mmlive>/.test(text)) {
                text = text.replace(/<mmlive>(.+?)<\/mmlive>/g, '');
            }

            //小程序，匹配 白名单
            if (/<appid>/.test(text) && this.conf.minapp) {

                let appid = /<appid>(?:\<\!\[CDATA\[)?(.+?)(?:\]\]\>)?<\/appid>/.exec(text)[1];
                let allow = this.conf.minapp.indexOf(appid) >= 0;

                log.info('小程序', { 'appid': appid, 'allow': allow, 'struct': text });

                if (!allow) {
                    continue;
                }
            }

            //满足所有条件
            if (size == Object.keys(where).length) {

                let exch = false;

                //不转链，文本类型，没有配置原样规则 或 文本不匹配
                if (item.msgType == 1 && (!this.inst.origin || !this.inst.origin.test(text))) {
                    exch = (act.detectTbc(text) || act.detectUrl(text));
                    exch && data.convert++;
                }

                data.message.push({ msgid: item.msgId, rowid: item.newMsgId, msgtype: item.msgType, content: text, source: item.msgSource, product: null, exch });

            }

        };

        //只取一条时，直接返回消息体
        if (limit == 1) {
            return data.message.length ? data.message[0] : null;
        } else {
            return data;
        }

    }

    //////////// 辅助方法 /////////////

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

                if (!err && ret) {
                    resolve(JSON.parse(ret));
                    return;
                }

                self.wx.SnsUploadPut(userName, url).then(res => {

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
            });
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

            this.mysql.query('UPDATE `pre_weixin_forward` SET send_res = ?, send_time = UNIX_TIMESTAMP(), send_count = ? , status = ? WHERE id = ?', [resMsg, sendTimes, status, forwardId]);
        }
    }

}


module.exports = ForwardNew;