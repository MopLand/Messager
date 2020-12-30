'use strict'

/**
 * 微信群控制器
 */

const wx = require('../lib/weixin');
const com = require('../lib/common');
const req = require('../lib/request');
const act = require('../lib/activity');
const Logger = require('../lib/logger');
const { sleep } = require('../lib/common');
const tag = com.fileName(__filename, false);
const log = new Logger(tag);

/**
 * 用户 TAG
 * 1 ： '测试通道'
 * 2 ： '禁小程序'
 * 4 ： '禁止转链'
 * 8 ： 'example'
 */

class GroupsSend {

    /**
     * 构造函数
     */
    constructor(conf) {
        this.inst = {};
        this.conf = conf;
        this.wx = new wx(conf.weixin, conf.reserve, conf.special);
        this.redis = com.redis(conf.redis);
        this.sider = com.redis(conf.redis);

        conf.mysql.charset = 'utf8mb4';
        this.mysql = com.mysql(conf.mysql, (db => { this.mysql = db; }).bind(this));

        this.members = {};
        this.updated = {};
        this.queues = [];
        this.locked = 0;
        this.sender = 0;

        this.cardCon = null; // 红包卡片配置
        this.cardTime = [11, 15, 17]; // 发红包时间点
        this.cardRooms = []; // 已发送过红包消息的源头群
    }

    init() {

        this.item = 'groups_send';

        //Redis消息频道
        var channel = 'mm_groups_send';

        // 获取卡片消息配置
        this.cardConfig = 'https://proxy.guodongbaohe.com/assets/cardConfig'

        // 获取美团H5链接
        this.meituan = 'https://proxy.guodongbaohe.com/meituan/coupon';

        // 饿了么
        this.element = 'https://app.guodongbaohe.com/event/go/d1PCDE';

        ///////////////

        //消息筛选条件
        var where = {};

        ///////////////

        //订阅消息发送
        this.subscribe(channel, where);
    }

    /**
     * 设置消息锁
     * @param string 锁名称
     * @param object 最后一个用户
     * @param string 消息ID
     */
    setLocked(roomid, item, last, pakId) {

        var self = this;
        var clok = setInterval(() => {

            //队列中还有消息
            if (self.queues.length) {
                return;
            }

            //消息可能还在发送中
            if (com.getTime() - self.sender <= 30) {
                return;
            }

            //清掉发送状态
            self.sender = 0;

            //删除锁文件
            com.unlock(item);
            act.record(self.mysql, self.item, { 'quantity': self.members[roomid].length, 'package': pakId, 'last_man': last }, '发送完成');

            //清除定时器
            clearInterval(clok);

        }, 1000 * 10);

        ///////////////

        //创建锁文件
        com.locked(item);

        //开始发送状态
        self.sender = com.getTime();

    }

    /**
     * 订阅消息
     * @param string 消息频道
     * @param object 消息过滤
     */
    subscribe(channel, where) {

        let self = this;
        let wait = 60;

        //处理 Redis 消息
        this.redis.on('message', function (channel, message) {

            let recv = JSON.parse(message);

            //正在读取消息，锁还未失效
            if (self.locked && self.locked >= com.getTime() - wait) {
                log.info('读消息锁', self.locked);
                return;
            } else {
                self.locked = com.getTime();
                log.info('拉取方式', { channel, message });
            }

            log.info('原始消息', recv);

            //获取最新消息
            var roomid = recv.roomid;// 消息源群ID
            var data = self.filterMessage(roomid, recv.msgid, recv.data, where);
            var size = data.message.length;

            //发送最新消息
            if (size) {
                self.send(roomid, data);
            }

            log.info('消息数量', { '通知ID': recv.msgid, '原消息': recv.data.length, '筛选后': size });
            log.info('有效消息', data);

            act.record(self.mysql, self.item, data, '发群消息');

            //解除读消息锁
            self.locked = 0;

        });

        //订阅 Redis 频道消息
        this.redis.subscribe(channel);

    }

    /**
     * 循环发送微信群
     * @param string roomid 消息源群ID
     * @param object 消息数据
     * @param string 预处理方式类型【groups, card】
     * @param object 筛选用户条件
     * @param object 筛选用户条件值
     */
    send(roomid, data) {

        var self = this;

        self.getMember(roomid, () => {

            //获取用户副本，限定每分钟发送量，并计算每人所需间隔时间
            var user = com.clone(self.members[roomid]);

            if (user.length == 0) {
                log.info('用户为空', user);
                return;
            }

            var size = user.length;
            var mins = size / 500;
            var span = (mins * 60 * 1000) / size;

            var func = (i) => {

                //预处理消息
                self.parseMessage(user[i], data);

                //下一下用户
                if (i < size - 1) {
                    setTimeout(() => { func(i + 1); }, span);
                }

                //本地测试，单用户
                if (size == 1) {
                    setTimeout(self.forwardMessage.bind(self), span);
                }

                ////////////

                //锁定 GIT
                if (i == 0) {
                    self.setLocked(roomid, self.item, user[size - 1], data.package);
                }

            }

            //开始执行
            func(0);

        });

    }

    /**
     * 拉取有效用户
     * @param string fromroomid 消息源群ID
     * @param object where      消息源群ID
     * @param object val        消息源群ID
     * @param function          回调方法
     */
    getMember(fromroomid, func) {

        var self = this;

        // fromroomid 该消息源群用户列表最近 5 分钟内更新过
        let updateTime = self.updated[fromroomid] ? self.updated[fromroomid] : 0;
        if (self.members[fromroomid] != undefined && self.members[fromroomid].length && com.getTime() - updateTime <= 60 * 5) {
            return func();
        }

        /////////

        //昨天时间
        var last = com.strtotime('-1 day');
        var date = new Date(last * 1000).format('yyyyMMdd');

        //二十分钟
        var time = com.getTime() - self.conf.active;

        var sql = "SELECT auto_id, member_id, weixin_id, groups_list, tag FROM `pre_weixin_list` WHERE groups = 1 AND groups_num > 0 AND created_date <= ? AND heartbeat_time >= ? AND roomids LIKE ? ORDER BY auto_id ASC"

        self.mysql.query(sql, [date, time, '%' + fromroomid + '%'], function (err, res) {

            if (err) {
                log.error(err);
                return;
            }

            var member = [];
            var useids = [];

            for (let i = 0; i < res.length; i++) {

                var groups = JSON.parse(res[i].groups_list);

                //过滤包含消息源群的有效群
                groups = groups.filter(ele => {
                    if (fromroomid == 'all' || ele.roomid == fromroomid) {
                        return ele;
                    }
                });

                // 群开关
                var roomid = groups.map(ele => {
                    if (ele.switch == undefined || ele.switch == 1) {
                        return ele.userName;
                    }
                });

                // 群开关
                var roomidInfo = groups.map(ele => {

                    if (ele.switch == undefined || ele.switch == 1) {
                        return {
                            'roomid': ele.userName,
                            'mini': ele.mini == undefined || (ele.mini && ele.mini == 1) ? true : false
                        };
                    }
                });

                if (roomid.length > 0) {
                    useids.push(res[i].member_id);
                    member.push({ member_id: res[i].member_id, weixin_id: res[i].weixin_id, tag: res[i].tag, roomid, roomidInfo, fromroomid: fromroomid });
                }

            }

            //最后一个用户加个标记
            if (useids.length) {
                member[useids.length - 1].end = true;
            }

            // fromroomid 该消息源群用户缓存
            self.members[fromroomid] = member;

            // fromroomid 该消息源群用户缓存时间
            self.updated[fromroomid] = com.getTime();

            act.record(self.mysql, self.item, { 'quantity': useids.length, 'member_ids': useids, fromroomid: fromroomid }, '筛选用户');

            log.info('筛选用户', '在线用户 ' + res.length + ' 人，群发用户（' + fromroomid + '）' + member.length + ' 人，发送状态 ' + self.sender);

            func();

        });

    }

    /**
     * 删除无效群
     * @param integer 用户ID
     * @param string 群ID
     */
    delGroup(member_id, group_id) {

        var self = this;

        self.mysql.query('SELECT * FROM `pre_weixin_list` WHERE member_id = ? LIMIT 1', [member_id], function (err, res) {

            if (err) {
                log.error(err);
                return;
            }

            if (res.length == 0 || !res[0].groups_list) {
                log.info('无效用户', res.length + ' 人');
                return;
            }

            //当前用户
            let member = res.shift();

            //清除此群
            var groups = JSON.parse(member.groups_list);
            var newgrp = groups.filter(ele => {
                return ele.userName != group_id;
            });

            var roomids = [];
            for (let i = 0; i < newgrp.length; i++) {
                let item = newgrp[i].roomid;

                if (item && roomids.indexOf(item) == -1) {
                    roomids.push(item);
                }
            }

            //更新微信群
            self.mysql.query('UPDATE `pre_weixin_list` SET groups_num = ?, groups_list = ?, roomids = ? updated_time = UNIX_TIMESTAMP() WHERE member_id = ?', [newgrp.length, JSON.stringify(newgrp), roomids.join(','), member_id]);

            log.info('删除群组', { member_id, group_id, groups, newgrp });

        });

    }

    /**
     * 消息过滤器
     * @param string 群ID
     * @param string 消息包ID
     * @param object 消息数据
     * @param object 过滤条件
     * @param integer 返回数据，-1 全返回，1 仅返回单条
     */
    filterMessage(roomid, pakId, msgs, where = {}, limit = -1) {

        //构造数据包
        var data = {

            //需要转链
            convert: 0,

            //消息包ID
            package: pakId,

            // 群ID
            roomid: roomid,

            //消息列表，{ exch, msgid, msgtype, content, source }
            message: [],
        };

        for (let i = 0; i < msgs.length; i++) {

            var size = 0;
            var item = msgs[i];
            let text = item.content;
            let exch = false;

            item.msgType = Number(item.msgType);

            //撤回消息，查找之前的 rowid 并过滤掉 
            if (item.msgType == 10002) {

                let rawid = item.newMsgId;

                if (rawid) {

                    log.info('撤回消息', { 'rawid': rawid, 'text': text });

                    data.message = data.message.filter(ele => {
                        return ele.rowid != rawid;
                    });

                }

            }

            //支持的消息类型：1 文字、3 图片、43 视频、47 表情、49 小程序、90 美团、 91 饿了么
            if ([1, 3, 43, 47, 49, 90, 91].indexOf(item.msgType) == -1) {
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
            data = data.message.length ? data.message[0] : null;
        }

        return data;

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
                        log.info('转链失败', { 'member_id': user.member_id, body, lazy_time, 'convert': data.convert });
                    }

                    //self.mysql.query('UPDATE `pre_weixin_list` SET status = ?, status_time = ? WHERE member_id = ?', [ JSON.stringify( body ), com.getTime(), user.member_id ] );

                    act.pushed(self.mysql, user.member_id, body);

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

        if (typeof user.member_id == 'undefined') {
            return log.info('异常队列', user);
        }

        log.info('当前微信', { '用户ID': user.member_id, '微信号': user.weixin_id, '群数量': user.roomid.length, '消息量': data.message.length });

        var func = () => {

            log.info('消息拆包', { '用户ID': user.member_id, '消息包': data.package, '待发送': data.message.length });

            let msg = data.message.shift();
            let res = self.sendMsg(user, msg);

            self.sender = com.getTime();

            res.then(ret => {

                //本消息含商品
                if (msg.product && data.roomid) {

                    act.collect(self.mysql, data.roomid, msg.product);
                }

                //消息包已完成
                if (data.message.length == 0) {

                    log.info('群发完毕', [user.member_id, data.package]);

                    // 到点发送红包卡片
                    self.sendCardMsg(user);

                    //更新发群时间
                    self.mysql.query('UPDATE `pre_weixin_list` SET groups_time = UNIX_TIMESTAMP(), groups_send = groups_send + 1 WHERE member_id = ?', [user.member_id]);

                }

            }).catch(err => {

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
     * 发送卡片消息
     * @param object 用户信息
     */
    async sendCardMsg(user) {
        var self = this;

        let isHours = self.cardTime.indexOf((new Date).getHours()) > -1; // 是否到了发红包点
        let isFrom = self.cardRooms.indexOf(user.fromroomid) == -1; // 该源头群是否发过红包

        // 判断是否符合发红包时间
        if (!isHours) {

            // 不在红包时间 重置全局数据
            if (!(self.cardCon === null)) {
                self.cardCon = null;
                self.cardRooms = [];
            }

            return;
        }

        // 判断是否符合发红包 未发送消息的源群
        if (!isFrom) {
            return;
        }

        // 获取红包配置
        if (self.cardCon === null) {
            self.cardCon = await self.getCardConfig();
        }

        // 如果全局
        if (self.cardCon === null || (typeof self.cardCon == 'object' && self.cardCon.length == 0)) {
            return;
        }

        // 保存已发送过红包的源群
        self.cardRooms.push(user.fromroomid);

        let data = self.cardCon;

        for (let i = 0; i < data.length; i++) {

            let item = data[i];

            self.parseCardMsg(user, item.msgtype, (card) => {

                if (card != null) {

                    item.content['url'] = card;
                    let cardRet = self.sendMsg(user, item);

                    cardRet.then(_res => {
                        log.info('发送红包成功', { '发红包搜索源群': user.fromroomid, '红包用户': user.member_id });
                    });
                }

            });
        }
    }

    /**
     * 预处理卡片消息
     * @param object 用户数据
     * @param object 发群数据
     * @param function 返回函数
     */
    parseCardMsg(user, msgtype, func) {

        var self = this;

        let url = msgtype == 90 ? self.meituan : self.element;
        let param = msgtype == 90 ? { member_id: user.member_id, plat: 'h5' } : { userid: user.member_id, ajax: '', callback: '' };

        req.get(url, param, (code, body) => {

            try {
                if (typeof body == 'string') {
                    body = JSON.parse(body);
                }
            } catch (e) {
                body = { 'status': -code, 'body': body, 'error': e.toString() };
            }

            ///////////////

            //成功转链数量
            if (body.status >= 0) {

                func(msgtype == 90 ? body.result : body.valued);

            } else {

                log.info('链接失败', { 'member_id': user.member_id, lazy_time, body });

                func(null);
            }

        });
    }

    /**
     * 卡片消息配置
     */
    getCardConfig() {

        var self = this;

        return new Promise((resolve, reject) => {

            req.get(self.cardConfig, {}, (code, body) => {

                log.info('卡片配置', body);

                try {
                    if (typeof body == 'string') {
                        body = JSON.parse(body);
                    }
                } catch (e) {
                    body = { 'status': -code, 'body': body, 'error': e.toString() };
                }

                if (body.status >= 0) {

                    var msgs = [];

                    if (body.result && body.result.meituan) {
                        msgs.push({
                            msgtype: 90,
                            content: body.result.meituan
                        });
                    }

                    if (body.result && body.result.elment) {
                        msgs.push({
                            msgtype: 91,
                            content: body.result.elment
                        });
                    }

                    if (msgs.length > 0) {
                        resolve(msgs);
                    }

                } else {

                    log.info('卡片配置错误', body);

                    resolve([])
                }
            });
        })
    }

    /**
     * 转发群消息
     * @param object 用户信息
     * @param object 单条消息
     */
    async sendMsg(member, msg) {

        var self = this;
        var detail = msg.content;

        // 用户发群数量
        let size = member.roomidInfo.length;

        if (size == 0) {
            log.error('发群用户对象', member);
            return com.Promise(false, '发群用户对象为空');
        }

        //文本
        if (msg.msgtype == 1) {

            // 判断个人商城链接
            if (detail.indexOf('.kuaizhan.com') > -1) {
                detail = detail.replace(/id=(\d*)/g, 'id=' + member.member_id);
            }

            // 从 roomidInfo 发群对象中获取 群数组同时发送文本
            let sendRoomid = [];
            for (var i = 0; i < size; i++) {
                let roomid = member.roomidInfo[i] && member.roomidInfo[i].roomid ? member.roomidInfo[i].roomid : '';
                sendRoomid.push(roomid);
            }

            let fn = this.wx.NewSendMsg(member.weixin_id, sendRoomid, detail, msg.source);

            fn.then(ret => {
                log.info('文本成功', [member.member_id, ret.count]);
            }).catch(err => {
                self.sendErr(member.member_id, 'NewSendMsg', err);
            });

            return fn;

        }

        //小程序 替换UID
        if (msg.msgtype == 49) {
            detail = detail.replace(/userid=(\d*)/g, 'userid=' + member.member_id);
        }

        for (var i = 0; i < size; i++) {

            let chat = member.roomidInfo[i] && member.roomidInfo[i].roomid ? member.roomidInfo[i].roomid : '';
            let mini = member.roomidInfo[i] && member.roomidInfo[i].mini ? true : false;

            if (chat == '') {
                continue;
            }

            //图片
            if (msg.msgtype == 3) {

                var fn = this.wx.UploadMsgImgXml(member.weixin_id, chat, detail);

                fn.then(ret => {
                    log.info('发图成功', [member.member_id, chat, ret.msgId]);
                }).catch(err => {
                    self.sendErr(member.member_id, 'UploadMsgImgXml', err, chat);
                });
            }

            //视频
            if (msg.msgtype == 43) {

                var fn = this.wx.UploadVideoXml(member.weixin_id, chat, detail);

                fn.then(ret => {
                    log.info('视频成功', [member.member_id, chat, ret.msgId]);
                }).catch(err => {
                    self.sendErr(member.member_id, 'UploadVideoXml', err, chat);
                });
            }

            //表情
            if (msg.msgtype == 47) {

                var fn = this.wx.SendEmojiXml(member.weixin_id, chat, detail);

                fn.then(ret => {
                    log.info('表情成功', [member.member_id, chat, ret]);
                }).catch(err => {
                    self.sendErr(member.member_id, 'SendEmojiXml', err, chat);
                });

                //多个微信群，适当延迟
                if (size > 1 && i < size - 1) {
                    await com.sleep(1000);
                }

            }

            //小程序
            if (msg.msgtype == 49 && mini) {

                //发送小程序
                if ((member.tag & 2) == 0) {

                    var fn = this.wx.SendAppMsgXml(member.weixin_id, chat, detail);

                    fn.then(ret => {
                        log.info('小程序成功', [member.member_id, chat, ret.msgId]);
                    }).catch(err => {
                        self.sendErr(member.member_id, 'SendAppMsgXml', err, chat);
                    });

                } else {

                    var fn = com.Promise(true, { 'status': 0, 'result': '已经忽略小程序发送' });

                }

            }

            // 卡片消息 自定义 类型 90 美团，91 饿了么
            if (msg.msgtype == 90 || msg.msgtype == 91) {

                if (!detail.url) {

                    log.info('卡片链接', '外卖卡片无链接');
                    var fn = com.Promise(true, '外卖卡片无链接');

                } else {

                    // 发送卡片信息 类似小程序
                    var fn = this.wx.SendAppMsg(member.weixin_id, chat, '', 0, 5, '', '', detail);

                    fn.then(ret => {

                        log.info('卡片消息', [member.member_id, ret.msgId]);

                    }).catch(err => {

                        self.sendErr(member.member_id, 'SendAppMsg', err);
                    });
                }
            }

        }

        return fn;

    }

    /**
     * 转发出错了
     * @param integer 用户ID
     * @param string API名称
     * @param string 错误消息
     * @param string 微信群ID
     */
    sendErr(member_id, api, err, chat) {

        //写入日志
        log.error(api, [member_id, err, chat]);

        //更新状态
        act.pushed(this.mysql, member_id, { api: api, err, chat, inst: this.inst.channel });

        //群已经失效
        if (err == 'MM_ERR_NOTCHATROOMCONTACT' && typeof chat == 'string') {
            this.delGroup(member_id, chat);
        }

    }

}

module.exports = GroupsSend;