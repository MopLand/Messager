'use strict'

const fxp = require("fast-xml-parser");
const wx = require('../lib/weixin');
const com = require('../lib/common');
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

        // 发群
        this.groups = new Groups(conf);

        // 订阅锁
        this.locked = 0;

        this.queues = [];
    }

    init() {
        //日志清理
        log.clean();


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

            // groups message
            // let message = {
            //     "msgid": 123,
            //     "member_id": 16189,
            //     "type": "groups", // groups 发群 ， moment 发圈
            //     "source": "taobao", // 发群源
            //     "data": [
            //         {
            //             'content': 'hehehehehehhehe',
            //             'msgType': 1, // 1 文本， 3 图片， 43 视频， 47 表情， 49 小程序， 
            //         },
            //         {
            //             'content': '13saads',
            //             'msgType': 3, // 1 文本， 3 图片， 43 视频， 47 表情， 49 小程序， 
            //         },
            //         {
            //             'content': 'https://item.jd.com/67734136286.html',
            //             'msgType': 1,
            //             'exch': 1
            //         }
            //     ]
            // };

            // moment message
            // let message = {
            //     "msgid": 123,
            //     "member_id": 16189,
            //     "type": "moment", // groups 发群 ， moment 发圈
            //     "data": {
            //         "moment": {
            //             "desc": "半斤开心果9.8元❗❗\n半斤开心果9.8元❗❗\n好评再返1✔\n\n罐装发货，颗粒饱满\n营养价值特高，家庭必备坚果[嘿哈]",
            //             "scene": 0,
            //             "style": 1,
            //             "images": [
            //                 "https://img.pddpic.com/mms-material-img/2020-11-13/240d7019-d9f4-4237-a000-d59846a769db.jpeg.a.jpeg",
            //                 "https://img.pddpic.com/mms-material-img/2020-08-10/0275152f-9e18-430c-b9dd-743e0decb36a.jpg.a.jpeg",
            //                 "https://img.pddpic.com/mms-material-img/2020-11-13/46979655-6184-455f-878e-3850801b5fd1.jpeg.a.jpeg",
            //                 "https://img.pddpic.com/mms-material-img/2020-08-12/e03bbf00-b9c4-4e2c-a685-cb71e337bbcd.jpg.a.jpeg",
            //             ]
            //         },
            //         "comment": [
            //             {
            //                 "text": "https://item.jd.com/67734136286.html",
            //                 "type": 2,
            //                 "exch": 1
            //             }
            //         ]
            //     }
            // }

            let recv = JSON.parse(message);
            // console.log(recv);return;

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

            let member = self.getMember(recv.member_id);

            member.then(data => {
                if (data.member_id == undefined) {
                    console.log('no number')
                    return;
                }

                if (recv.type == 'groups' && data.groups == 1) {
                    log.info('发群日志', '暂未开通发群');
                    return;
                    self.sendGroups(data, recv);
                }

                if (recv.type == 'moment' && data.moment == 1) {
                    self.sendMoment(data, recv);
                }

            }).catch(err => {
                console.log('get member err');
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
        const sendGroup = this.filterGroupsMessage(member, msg);

        sendGroup.then(data => {
            // console.log(data);
            // return;
            self.groups.parseMessage(member, data);

        }).catch(err => {
            log.info('读取错误', err);
        });
    }

    /**
     * 群消息格式化 
     * @param member 云发单用户信息
     * @param msg 发送消息
     */
    async filterGroupsMessage(member, msg) {
        //构造数据包
        var data = {

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

            // 图片
            if (item.msgType == 3) {
                text = await this.uploadMediaToWechat(member.weixin_id, text);
            }

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
     * 上传媒体信息加密
     * @param userName 微信ID
     * @param url 媒体链接
     */
    uploadMediaToWechat(userName, url) {
        var self = this;
        var wxImgKey = 'wx_media_' + com.md5(url);

        const test = `<?xml version="1.0"?>
        <msg>
            <img aeskey="151b7e3b1c469f816fca6359f660eb46" encryver="1" cdnthumbaeskey="151b7e3b1c469f816fca6359f660eb46" cdnthumburl="3053020100044730450201000204aa7a562602032f54cd0204b33ca17b02045fc066a5042066303538343761363861656561663436383964623364643565663537343734630204010828010201000405004c52ad00" cdnthumblength="4806" cdnthumbheight="0" cdnthumbwidth="0" cdnmidheight="0" cdnmidwidth="0" cdnhdheight="0" cdnhdwidth="0" cdnmidimgurl="3053020100044730450201000204aa7a562602032f54cd0204b33ca17b02045fc066a5042066303538343761363861656561663436383964623364643565663537343734630204010828010201000405004c52ad00" length="71116" cdnbigimgurl="3053020100044730450201000204aa7a562602032f54cd0204b33ca17b02045fc066a5042066303538343761363861656561663436383964623364643565663537343734630204010828010201000405004c52ad00" hdlength="71160" md5="2784c030fc1f3b9921700aafeb95e4d3" />
        </msg>`;

        return new Promise((resolve, reject) => {

            // 判断图片是否上传
            self.redis.get(wxImgKey, (err, ret) => {
                console.log('redis ret', ret);

                if (!err && ret) {
                    resolve(ret);
                } else {
                    // 上传图片到微信
                    self.redis.set(wxImgKey, test, (_err, _ret) => {
                        console.log('redis set _ret', _ret);
                    });
                    self.redis.expire(wxImgKey, 3600 * 24 * 7);
                    resolve(test);
                }
            });
        })
    }

    //////////// 朋友圈 /////////////

    /**
     * 发送朋友圈信息
     * @param object member 用户信息
     * @param object msg 朋友圈消息
     */
    sendMoment(member, msg) {
        var self = this;

        const userName = member.weixin_id;

        const sendData = this.filterMementMessage(userName, msg);

        sendData.then(data => {
            // console.log(data);
            // return;
            self.moment.forwardMoment(member, data);
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
                            "type": wximages.thumbUrls[0].type,
                        },
                        "#text": wximages.thumbUrls[0].url
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
                await com.sleep(300);
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

                        console.log('SnsUploadPut res', res);

                        if (res != null
                            && res.baseResponse.ret == "MM_OK"
                            && res.thumbUrls
                            && res.thumbUrls[0]
                            && res.bufferUrl) {

                            self.redis.set(wxImgKey, JSON.stringify(res), (_err, _ret) => {
                                console.log('redis set _ret', _ret);
                            });
                            self.redis.expire(wxImgKey, 3600 * 24 * 7);

                            resolve(res);
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
    getMember(memberId) {

        var self = this;

        return new Promise((resolve, reject) => {

            //昨天时间
            var last = com.strtotime('-1 day');
            var date = new Date(last * 1000).format('yyyyMMdd');
            //二十分钟
            var time = com.getTime() - self.conf.active;

            const sql = 'SELECT auto_id, member_id, weixin_id, groups_list, moment, groups, tag FROM `pre_weixin_list` WHERE member_id = ? AND created_date <= ? AND heartbeat_time >= ? LIMIT 1';

            self.mysql.query(sql, [memberId, date, time], function (err, res) {
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
                            if (!self.inst.source || ele.status == self.inst.source) {
                                return ele.userName;
                            }
                        });

                        //提取群ID
                        res.roomid = groups.map(ele => {
                            return ele.userName;
                        });
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

}


module.exports = Forward;