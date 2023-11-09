'use strict'

/**
 * 微信群控制器
 */

const fs = require('fs');
const wx = require('../lib/weixin');
const com = require('../lib/common');
const req = require('../lib/request');
const act = require('../lib/activity');
const Logger = require('../lib/logger');
const tag = com.fileName(__filename, false);
var	  log = new Logger( tag, true, true );

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
    constructor( conf, logd = null ) {
        this.inst = {};
        this.conf = conf;
        this.wx = new wx(conf.weixin, conf.reserve, conf.special);
        this.redis = com.redis(conf.redis);
        this.sider = com.redis(conf.redis);
        this.mysql = com.mysql(conf.mysql, (db => { this.mysql = db; }).bind(this));

        this.members = {};
        this.updated = {};
        this.sending = {};
        this.queues = [];
        this.locked = 0;
        this.sender = 0;

		this.hongbao = [];	//红包卡片配置
        //this.cardCon = null; // 红包卡片配置
        this.cardTime = [11, 17]; // 发红包时间点
        this.cardRooms = []; // 已发送过红包消息的源头群

		if( logd ){
			log = logd;
		}

    }

    async init() {

        this.item = 'groups_send';
        this.inst = this.conf[this.item];

        //Redis消息频道
        var channel = 'mm_groups_send';

        ///////////////

        // 获取卡片消息配置
        this.cardConfig = this.inst.card_config;

        // 获取美团H5链接
        //this.meituan = this.inst.meituan;

        // 饿了么
        //this.element = this.inst.element;

        // 发红包时间点
        this.cardTime = this.inst.card_time;

        // 已发送或禁发红包消息的源头群
        this.cardRooms = this.inst.card_rooms;

		//获取红包配置
		this.getConfig( this.inst.card_config );

        ///////////////

        //当前 PM2 实例数量
		let pwd = process.cwd();
        let txt = fs.readFileSync(pwd + '/run/'+ this.item +'.json');
        let set = JSON.parse(txt);

		//实例ID，PM2 分流
		this.nodes = set.instances || 1;
        this.insid = process.env.NODE_APP_INSTANCE || 0;

        //log.info( 'Process', process.env );
        log.info( '应用实例', '实例数量 ' + this.nodes + '，当前实例 ' + this.insid );		

		if ( this.nodes == 1 && this.insid > 0 ) {
			log.info('实例错误', '实例数量与实例不匹配');
			return;
		}

		//清理失效Git锁
		log.clean( 3, '/', '.gitlock' );

        ///////////////

        //消息筛选条件
        var where = {};

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
		//var lock = item + '.' + roomid;
		var lock = roomid;
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
            com.unlock(lock);
            //act.record(self.mysql, self.item, { 'quantity': self.members[roomid].length, 'package': pakId, 'last_man': last }, '发送完成');

            //清除定时器
            clearInterval(clok);

        }, 1000 * 10);

        ///////////////

        //创建锁文件
        com.locked(lock);

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
                log.info('拉取方式', { 'instance' : self.insid, channel, message });
            }

            //log.info( '运行实例', '实例数量 NODES：' + self.nodes + '，当前实例 INST：' + self.insid );

			/////////////

            log.info('原始消息', recv);

            //获取最新消息，消息源群ID
            var roomid = recv.roomid;
            var data = self.filterMessage(roomid, recv.lastid, recv.message, where);
            var size = data.message.length;

            //发送最新消息
            if (size) {
                self.send(roomid, data, recv.forced);
            }

            log.info('消息数量', { '通知ID': recv.lastid, '原消息': recv.message.length, '筛选后': size });
            log.info('有效消息', data);

            //act.record(self.mysql, self.item, data, '发群消息');

            //解除读消息锁
            self.locked = 0;

        });

        //订阅 Redis 频道消息
        this.redis.subscribe(channel);

    }

    /**
     * 循环发送微信群
     * @param string roomid 消息源群ID
     * @param object data 消息数据
     * @param boolean forced 强制发送
     */
    send(roomid, data, forced) {

        var self = this;

        self.getMember(roomid, () => {

            //获取用户副本，限定每分钟发送量，并计算每人所需间隔时间
            var user = com.clone( self.members[roomid] );

            if (user.length == 0) {
                log.info('用户为空', user);
                return;
            }

            var size = user.length;
            //var mins = size / 500;
            //var span = (mins * 60 * 1000) / size;
			var span = 200 - Math.round( size / 500 );

            var func = (i) => {

                //预处理消息
                self.parseMessage(user[i], data);

                //下一下用户
                if (i < size - 1) {
                    setTimeout(() => { func(i + 1); }, span);
                }

                //本地测试，单用户
                if (size == 1) {
                    setTimeout( self.forwardMessage.bind(self), span );
                }

                ////////////

                //锁定 GIT
                if (i == 0) {
                    self.setLocked( roomid.replace('@chatroom', ''), self.item, user[size - 1], data.package );
                }

            }

            //开始执行
            func(0);

        }, forced);

    }

    ////////// 用户信息相关方法 //////////

    /**
     * 拉取有效用户
     * @param string sourced 消息源群ID
     * @param function func 回调方法
     * @param boolean forced 强制发送
     */
    getMember( sourced, func, forced ) {

        var self = this;

        // sourced 该消息源群用户列表最近 5 分钟内更新过
        let updateTime = self.updated[sourced] ? self.updated[sourced] : 0;

		//优先使用 Member 缓存 
        if ( self.members[sourced] != undefined && self.members[sourced].length && com.getTime() - updateTime <= 60 * 5 ) {
            return func();
        }

        /////////

        //昨天时间
        var last = com.strtotime('-1 day');
        var date = new Date(last * 1000).format('yyyyMMdd');

        //二十分钟
        // var time = com.getTime() - self.conf.active;

        var sql = 'SELECT auto_id, member_id, weixin_id, groups_list, tag FROM `pre_weixin_list` WHERE groups_num > 0 AND created_date <= ? AND online = 1';
        var req = [ Number( date ) ];

        if ( self.nodes > 1 ) {
            sql += ' AND auto_id % ? = ?';
            req.push(self.nodes, self.insid);
        }

        if ( !forced ) {
            sql += ' AND FIND_IN_SET( ?, roomids )';
            req.push(sourced);
        }

        sql += ' ORDER BY auto_id ASC';

        self.mysql.query(sql, req, function (err, res) {

            if (err) {
                log.error(err);
                return;
            }

            let usable = self.filterMemberGroups( res, sourced, forced );
            let member = usable.member;
            let useids = usable.useids;

            //最后一个用户加个标记
            if ( useids.length ) {
                member[useids.length - 1].end = true;
            }

            // sourced 该消息源群用户缓存
            self.members[sourced] = member;

            // sourced 该消息源群用户缓存时间
            self.updated[sourced] = com.getTime();

            //act.record(self.mysql, self.item, { 'quantity': useids.length, 'member_ids': useids, sourced: sourced }, '筛选用户');

            log.info('筛选用户', '当前实例 ' + self.insid + '，在线用户 ' + res.length + ' 人，群发用户（' + sourced + '）' + member.length + ' 人，发送状态 ' + self.sender);

            func();

        });

    }

    /**
     * 过滤每个用户发群信息
     * @param object res 
     * @param string sourced
     * @param boolean forced 强制发送
     */
    filterMemberGroups( res, sourced, forced ) {

        var self = this;
        var member = [];
        var useids = [];
		var sticks = ['wxid_okvkiyguz1yh22', 'wxid_fdg7q8iedhd122'];

        // 是否符合发红包要求
        // let isCard = self.checkCardTime( sourced );

		//打乱用户顺序
		res.sort( (a, b) => {

			if( sticks.indexOf( a.weixin_id ) > -1 ){
				return -1;
			}

			if( sticks.indexOf( b.weixin_id ) > -1 ){
				return 1;
			}

			return Math.random() > 0.5 ? -1 : 1; 
		} );

		//找到清清位置，将其置顶
		/*
		var pos = res.findIndex( ( ele ) => { return ['wxid_okvkiyguz1yh22', 'wxid_fdg7q8iedhd122'].indexOf( ele.weixin_id ) > -1; } );
		if( pos > 0 ){
			[ res[0], res[pos] ] = [ res[pos], res[0] ];
		}
		*/		

        for (let i = 0; i < res.length; i++) {
			
            let groups = JSON.parse(res[i].groups_list);

			//过滤打开群发开关的群，用于发红包
            let hongbao = groups.map(ele => {
                if ( ele.switch == 1 && ele.roomid != '20875790073@chatroom' ) {
                    return ele.userName;
                }
            }).filter( ele => { return ele; });

			//////////
            
			//过滤包含消息源群的有效群
            let rooms = groups.filter(ele => {

				let advert = ele.advert == undefined || ele.advert == 1 ? true : false;
                let opened = ele.switch == undefined || ele.switch == 1 ? true : false;
                let minapp = ele.minapp == undefined || (ele.minapp && ele.minapp == 1) ? true : false;
                let anchor = true; // ele.anchor == undefined || (ele.anchor && ele.anchor == 1) ? true : false;

				//强制推送的插单，判断是否允许广告
				if( forced && !advert ){
					return false;
				}

                //强制全量；筛选有效群；开关打开；小程序和链接不能同时不发(针对拼多多)
                if ( ( opened && forced && ele.roomid != '20875790073@chatroom' ) || ( ele.roomid == sourced && opened && ( minapp || anchor) ) ) {
                    ele.minapp	= minapp; // 小程序 (针对拼多多)
                    ele.anchor	= anchor; // 链接 (针对拼多多)
                    return ele;
                }

            }).map(ele => {
                return {
                    roomid: ele.userName,
                    minapp: ele.minapp,
                    anchor: ele.anchor,
                };
            });

			//////////

            if ( rooms.length > 0 ) {
                useids.push(res[i].member_id);
                member.push({ member_id: res[i].member_id, weixin_id: res[i].weixin_id, tag: res[i].tag, rooms, hongbao, sourced: sourced });
            }

        }

        return { member, useids };
    }

    /**
     * 删除无效群
     * @param integer 用户ID
     * @param string 群ID
     */
    delGroup(member_id, weixin_id, group_id) {

        var self = this;

        self.mysql.query('SELECT * FROM `pre_weixin_list` WHERE member_id = ? AND weixin_id = ? LIMIT 1', [member_id, weixin_id], function (err, res) {

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

            var roomids = newgrp.map( ele => {
				return ele.roomid;
			}).filter( function( ele, pos, arr) {
				return arr.indexOf( ele, 0) === pos;
			});

            //更新微信群
            self.mysql.query('UPDATE `pre_weixin_list` SET groups_num = ?, groups_list = ?, roomids = ?, updated_time = UNIX_TIMESTAMP() WHERE member_id = ? AND weixin_id = ?', [newgrp.length, JSON.stringify(newgrp), roomids.join(','), member_id, weixin_id]);

            log.info('删除群组', { member_id, weixin_id, group_id, groups, newgrp });

        });

    }

    ////////// 群消息处理相关方法 //////////

    /**
     * 消息过滤器
     * @param string 源头群ID
     * @param string 消息包ID
     * @param object 消息数据
     * @param object 过滤条件
     * @param integer 返回数据，-1 全返回，1 仅返回单条
     */
    filterMessage(roomid, pakId, msgs, where = {}, limit = -1) {

        //构造数据包
        var data = {

            //实例ID
            insid: this.insid,

            //消息数量
            msgsize: 0,

            //需要转链
            convert: 0,

            //消息包ID
            package: pakId,

            //源头群ID
            sourced: roomid,

            //消息列表，{ msgid, source, msgtype, content, keyword }
            message: [],

			//创建时间
			created: com.getTime(),
        };

		//是否丢掉包
		var drop = false;

        for (let i = 0; i < msgs.length; i++) {

            var size = 0;
            var item = msgs[i];
            let keep = item.fixedly;
            let text = item.content;

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

            //支持的消息类型：1 文字、3 图片、43 视频、47 表情、49 小程序、90 红包
            if ([1, 3, 43, 47, 49, 90].indexOf(item.msgType) == -1) {
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
            // if (/<appid>/.test(text) && this.conf.minapp) {

            //     let appid = /<appid>(?:\<\!\[CDATA\[)?(.+?)(?:\]\]\>)?<\/appid>/.exec(text)[1];
            //     let allow = this.conf.minapp.indexOf(appid) >= 0;

            //     log.info('小程序', { 'appid': appid, 'allow': allow, 'struct': text });

            //     if (!allow) {
            //         continue;
            //     }
            // }

			//文本消息，检查是否有非白名单链接
			if( item.msgType == 1 && this.inst.whited ){

				let urls = text.match( /(https?):\/\/[-A-Za-z0-9+&@#\/%?=~_|!:,.;]+[-A-Za-z0-9+&@#\/%=~_|]/gm );

				//只有两边都为 false 时，才相等，这时为未知链接
				for(let w in urls ){
					if( act.detectUrl( urls[w] ) == act.detectUrl( urls[w], this.inst.whited ) ){
						drop = true;
					}
				}
			}

            //满足所有条件
            if ( size == Object.keys(where).length ) {

                let exch = false;

                //不转链，文本类型，没有配置原样规则 或 文本不匹配
                if ( !keep && item.msgType == 1 && (!this.inst.origin || !this.inst.origin.test(text)) ) {
                    exch = (act.extractTbc(text) || act.detectUrl(text) || act.detectApp(text));
                    exch && data.convert++;
                }

				//生成消息队结构
                data.message.push({ 
					msgid: item.msgId, 
					rowid: item.newMsgId, 
					source: item.msgSource, 
					msgtype: item.msgType, 
					content: text, 
					product: null, 
					keyword: exch 
				});

            }

        };

        //只取一条时，直接返回消息体
        if (limit == 1) {
            data = data.message.length ? data.message[0] : null;
        }

		//发现未知链接，所有消息丢掉
		if( drop ){
			data.convert = 0;
			data.message = [];
			log.info('未知链接', { roomid, pakId, msgs });
		}

		data.msgsize = data.message.length;

        return data;

    }

    /**
     * 预处理消息
     * @param object 用户数据
     * @param object 发群数据
     * @param integer 延迟时间
     * @param string 解析商品
     */
    parseMessage(member, data, lazy_time = 0, product = 'true') {

        var user = com.clone(member);
        var data = com.clone(data);
        var self = this;
		let once = 0;
		let lock = 0;

		if( lock = self.sending[user.member_id] ){
		//	return log.info('消息独占', { '用户ID': user.member_id, '锁名称': lock, '位置': 'parse' } );
		}

        //无需转链，直接回调
        if (data.convert == 0) {
            self.queues.push({ 'member': user, data });
            self.forwardMessage();
            return;
        }

        for (let i = 0; i < data.message.length; i++) {

            let comm = data.message[i];
            let exch = comm.msgtype == 1 && comm.keyword;
            let misc = exch ? act.getExternal( comm.content ) : '';

            req.get(self.conf.convert, { 'member_id': user.member_id, 'text': comm.content, 'product': product, 'roomid': data.sourced, 'lazy_time': lazy_time, 'source': 'yfd', 'external': misc }, (code, body) => {

                try {
                    if (typeof body == 'string') {
                        body = JSON.parse(body);
                    }
                } catch (e) {
                    body = { 'status': -code, 'body': body, 'error': e.toString() };
                }

                ///////////////

                //成功转链数量 或 没有失败（原样返回）
                if ( body.status > 0 || ( body.status == body.fail && body.fail == 0 ) ) {

                    //文本
                    comm.content = body.result;

                    //原始商品信息
                    comm.product = body.product;

                    //转链成功，移除标记
					if( comm.keyword ){
						comm.keyword = null;
						data.convert--;
					}

					//全部转链完成，开始发送
                    if (data.convert == 0) {
                        self.queues.push({ 'member': user, data });
                        self.forwardMessage();
                    }

                } else {

                    body.err = '转链失败';
                    body.source = 'groups';
                    body.lazy_time = lazy_time;

                    let beian = body.special && 'beian' == body.special;

                    if ( exch ) {
                        log.info('转链失败', { 'member_id': user.member_id, body, lazy_time, 'convert': data.convert });
                    }

                    //self.mysql.query('UPDATE `pre_weixin_list` SET status = ?, status_time = ? WHERE member_id = ?', [ JSON.stringify( body ), com.getTime(), user.member_id ] );
                    act.updatePushed(self.mysql, user, body);

                    //写入延迟消息，更新发送状态，每组消息只重试一次
                    if ( !beian && lazy_time == 0 && once == 0 ) {
                        let time = once = com.getTime();
                        let span = 60 * 1000 * 3;
                        self.sender = time + span;
                        setTimeout(() => { self.parseMessage(user, data, time, product); }, span);
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
		let lock = 0;

		if( lock = self.sending[user.member_id] ){
		//	return log.info('消息独占', { '用户ID': user.member_id, '锁名称': lock, '位置': 'forward' } );
		}

        if (typeof user.member_id == 'undefined' || data.msgsize != data.message.length ) {
            return log.info('异常队列', { user, data });
        }

        log.info('当前微信', { '用户ID': user.member_id, '微信号': user.weixin_id, '群数量': user.rooms.length, '消息量': data.message.length });

        var func = () => {

            log.info('消息拆包', { '用户ID': user.member_id, '消息包': data.package, '待发送': data.message.length });

            let msg = data.message.shift();
            let res = self.sendMsg(user, msg);

			//消息发送锁标记
            self.sender = com.getTime();
			self.sending[user.member_id] = data.package;

            res.then(ret => {

                //本消息含商品，仅限有源商品
                if (msg.product && data.sourced) {
					for(let k in msg.product) {
						act.collect(self, 'groups', {
							"platform": msg.product[k],
							"item_id": k,
						}, data, { [data.sourced] : self.sender }, user.end );
					}
                }

                //消息包已完成
                if (data.message.length == 0) {

                    log.info('用户发完', { 'member' : user.member_id, 'package' : data.package, 'lastman' : user.end ? 1 : 0, 'instance' : self.insid });

                    //到点发送红包卡片
					if( data.sourced ){
						setTimeout(() => { self.sendCardMsg( user ); }, 2000);
					}

                    //更新发群统计和时间
                    self.mysql.query('UPDATE `pre_weixin_list` SET groups_send = IF( DATEDIFF(NOW(), FROM_UNIXTIME(groups_time) ) > 0, 0, groups_send ) + 1, groups_time = UNIX_TIMESTAMP() WHERE weixin_id = ?', [user.weixin_id]);

                }

            }).catch(err => {

                log.error('发群失败', [user.member_id, data.package, err]);

            }).finally(() => {

                //消息包未完成
                if (data.message.length > 0) {
                    setTimeout(() => { func(); }, 2500);
                }

				//消息包已完成，单用户解锁
                if (data.message.length == 0) {
					self.sending[user.member_id] = 0;
				}

				//队列全部完成
				if( self.queues.length == 0 ){
					log.info('群发完毕', [data.package, com.getTime() - data.created + '秒']);
				}

            });

        };

        func();

    }

    ////////// 红包相关方法 //////////

    /**
     * 红包卡片配置
     * @param string 配置地址
     */
    getConfig( url ) {

		var self = this;

        req.get(url, {}, (code, body) => {

			log.shoot('红包配置', body);

			try {
				if (typeof body == 'string') {
					body = JSON.parse(body);
				}
				self.hongbao = self.fmtMsgList( body.result );
			} catch (e) {
				body = { 'status': -code, 'body': body, 'error': e.toString() };
				log.shoot('红包错误', body);
			}

		});

    }

    /**
     * 判断是否发送红包
     * @param string weixin
     * @return Boolean 
     */
    checkCardTime( weixin ) {

        var self = this;
		let send = false;
        let date = new Date();
        let hour = date.getHours();
		let mark = weixin + ':' + hour;

        let unSend = self.cardRooms.indexOf(mark) == -1; // 该微信是否发过红包
        let isHour = self.cardTime.indexOf(hour) > -1; // 是否到了发红包点
        let isMins = hour == 11 || date.getMinutes() >= self.inst.card_minute; // 11 发送，或者 17:30 发送

        // 避免源头群重复发红包
        if ( weixin && isHour & isMins && unSend ) {
            send = self.cardRooms.push( mark );
        }

        return send;
    }

    /**
     * 预处理红包消息
     * @param object 红包配置信息
     */
    fmtMsgList( data ) {

        var msgs = [{
            msgtype: 47,
            content: `<msg>
                <emoji fromusername="wxid_frgh4iv691jk22" tousername="8049512147@chatroom" type="2" idbuffer="media:0_0" md5="b678563ef6b7efb1b346bc6da6040e8a" len="181020" productid="" androidmd5="b678563ef6b7efb1b346bc6da6040e8a" androidlen="181020" s60v3md5="b678563ef6b7efb1b346bc6da6040e8a" s60v3len="181020" s60v5md5="b678563ef6b7efb1b346bc6da6040e8a" s60v5len="181020" cdnurl="http://emoji.qpic.cn/wx_emoji/lym8NlLVX3gUoFynz5lu5kASeMic6NXXyWuyGms627Z07wqfZK9ADZUCvOGXU0yVj/" designerid="" thumburl="" encrypturl="http://emoji.qpic.cn/wx_emoji/lym8NlLVX3gUoFynz5lu5kASeMic6NXXyWuyGms627Z04oAKGYUic7jnMS0TKCFkPf/" aeskey="545d84c316bf958cd293e95646037d58" externurl="http://emoji.qpic.cn/wx_emoji/GicyFVCQdyeV1kjWKnfcnNefkGW1l8ALl9DuaUfnfaKKM6uUrJDcs6dl6EsUzPX4j/" externmd5="b5ef9dc1931a2bd4dff23d0a1258c92d" width="640" height="71" tpurl="" tpauthkey="" attachedtext="" attachedtextcolor="" lensid="" emojiattr="" linkid=""></emoji>
            </msg>`
        }];

		if (this.inst && this.inst.card_title) {
            msgs.push({
                msgtype: 1,
                content: this.inst.card_title
            });
        }

		var size = msgs.length;

		//var msgs = [];

		for (let k in data) {
			if( data[k].status == 'on' ){
				msgs.push({
					msgtype: 90,
					subtype: k,
					content: data[k]
				});
			}
		}

        return msgs.length > size ? msgs : [];
    }

    /**
     * 发送卡片消息
     * @param object 用户信息
     * @param bool 强制发送
     */
    sendCardMsg(user, force = false) {

        var self = this;

		//当前是否允许发红包
		if( !force && !self.checkCardTime( user.weixin_id ) ){
            return;
		}

		//生成红包消息列表
        let bags = com.clone( self.hongbao );
		let room = [];

		//获取用户发红包群
		user.hongbao.forEach( ele => {
			room.push( { roomid : ele, anchor : true, minapp : true } );
		} );

		log.info('开始红包', { 'member': user.member_id, 'groups': user.hongbao, 'hongbao': bags, 'instance' : self.insid });

        let push = () => {

            let item = bags.shift();

            self.parseCardMsg(user, item, (card) => {

                //if ( card != null ) {

					delete card.content['api'];
					delete card.content['status'];

                    let ret = self.sendMsg( user, card, room );
					let tag = card.title || card.msgtype;

                    ret.then(res => {

                        log.info('红包成功', { 'member': user.member_id, 'room': user.hongbao, 'card': tag, 'sourced': user.sourced, 'instance' : self.insid });

                    }).catch(err => {

                        log.error('红包失败', { 'member': user.member_id, 'room': user.hongbao, 'card': tag, 'instance' : self.insid, err });
        
                    }).finally(() => {

                        //红包包未完成
                        if ( bags.length > 0 ) {
                            setTimeout(() => { push(); }, 3000);
                        }
        
                    });
                //}
                
            });
        }

        bags.length && push();		
    }

    /**
     * 预处理卡片消息
     * @param object 用户数据
     * @param object 红包消息（单条）
     * @param function 返回函数
     */
    parseCardMsg(user, item, func) {
		
        var self = this;

        if ( !user.member_id ) {
            log.info('无效用户', { 'user': user, item });
            //func(null);
			return;
        }

		//console.log( 'item', item );

		//红包类型 type = 90，必需有 api
		if( item.msgtype != 90 || !item.content.api ){
			log.info('红包消息', { user, item });
			func( item );
			return;
		}

		////////////

        //var cache = this.inst.card_cache + ':' + item.subtype + ':' + user.member_id;

		if( item.content.api.indexOf('{UID}') > -1 ){
			var opurl = item.content.api.replace('{UID}', user.member_id);
		}else{
			var opurl = item.content.api + '&member_id=' + user.member_id;
		}

		//console.log( 'cache', cache );

		req.get( opurl, {}, (code, body) => {

			try {
				if (typeof body == 'string') {
					body = JSON.parse(body);
				}
			} catch (e) {
				body = { 'status': -code, 'body': body, 'error': e.toString() };
			}

			//成功转链
			if (body.status >= 0) {

				log.info('链接成功', { user, body });

				//滴滴 h5_link，饿了么 h5_short_link，美团 result
				item.content.url = body.result.h5_link || body.result.h5_short_link || body.result;

				//console.log( item.content.url );
				func( item );

				// 缓存红包链接 3 天
				//self.sider.set(cache, item.content.url);
				//self.sider.expire(cache, 3600 * 24 * 3);

			} else {

				log.info('链接失败', { 'member_id': user.member_id, body });

				//func( null );
			}

		}, ( tmp ) => {
			
			// 获取红包链接缓存
			//self.sider.get( cache, ( err, ret ) => {
			//	if (!err && ret) {
			//		return { 'request': false, 'respond': { 'status': 1, 'result': ret } };
			//	}else{
					return { 'request': true };
			//	}
			//});

		});
    }

    ////////// 消息发送相关方法 //////////

    /**
     * 转发群消息
     * @param object 用户信息
     * @param object 单条消息
     * @param object 红包群
     */
    async sendMsg( member, msg, hongbao ) {

        var self = this;
        var body = msg.content;	
        var rooms = hongbao ? hongbao : member.rooms;

        // 用户发群数量
        if ( rooms.length == 0 ) {
            log.error('用户空群', member);
            return com.Promise(false, '用户空群');
        }

		/////////////

        //文本
        if ( msg.msgtype == 1 ) {

            // 判断个人商城链接
            body = act.replaceUserid( body, member.member_id );

            // 从 rooms 发群对象中获取 群数组同时发送文本
            let chats = [];

            for (var i = 0; i < rooms.length; i++) {

                if ( msg.keyword && !rooms[i].anchor && act.detectUrl(body) ) {
                    continue;
                }

                chats.push(rooms[i].roomid);
            }

            if ( chats.length == 0 ) {
                log.info('过滤消息', [member, msg, chats]);
                return com.Promise(true, [member, msg]);
            }

            let fn = this.wx.NewSendMsg(member.weixin_id, chats, body, msg.source, 1);

            fn.then(ret => {
                log.info('文本成功', { 'member' : member.member_id, 'count' : ret.count, 'instance' : self.insid });
            }).catch(err => {
                self.sendErr(member, 'NewSendMsg', err);
            });

            return fn;

        }

		/////////////

        //小程序 替换UID
        if ( msg.msgtype == 49 ) {
            body = body.replace(/userid=(\d*)/g, 'userid=' + member.member_id);
        }

        for (var i = 0; i < rooms.length; i++) {

            let chat = rooms[i].roomid;
            let mini = rooms[i].minapp;

            if (chat == '') {
                continue;
            }

            //图片
            if (msg.msgtype == 3) {

                var fn = this.wx.UploadMsgImgXml(member.weixin_id, chat, body);

                fn.then(ret => {
                    log.info('发图成功', { 'member' : member.member_id, chat, 'msgid' : ret.msgId, 'instance' : self.insid });
                }).catch(err => {
                    self.sendErr(member, 'UploadMsgImgXml', err, chat, body);
                });
            }

            //视频
            if (msg.msgtype == 43) {

                var fn = this.wx.UploadVideoXml(member.weixin_id, chat, body);

                fn.then(ret => {
                    log.info('视频成功', { 'member' : member.member_id, chat, 'msgid' : ret.msgId, 'instance' : self.insid });
                }).catch(err => {
                    self.sendErr(member, 'UploadVideoXml', err, chat, body);
                });
            }

            //表情
            if (msg.msgtype == 47) {

                var fn = this.wx.SendEmojiXml(member.weixin_id, chat, body);

                fn.then(ret => {
                    log.info('表情成功', { 'member' : member.member_id, chat, ret, 'instance' : self.insid });
                }).catch(err => {
                    self.sendErr(member, 'SendEmojiXml', err, chat, body);
                });

                //多个微信群，适当延迟
                if ( rooms.length > 1 && i < rooms.length - 1 ) {
                    await com.sleep(1000);
                }

            }

            //小程序
            if (msg.msgtype == 49 && mini) {

                //发送小程序
                if ((member.tag & 2) == 0) {

                    var fn = this.wx.SendAppMsgXml(member.weixin_id, chat, body);

                    fn.then(ret => {
                        log.info('小程序成功', { 'member' : member.member_id, chat, 'msgid' : ret.msgId, 'instance' : self.insid });
                    }).catch(err => {
                        self.sendErr(member, 'SendAppMsgXml', err, chat, body);
                    });

                } else {

                    var fn = com.Promise(true, { 'status': 0, 'result': '已经忽略小程序发送' });

                }

            }

            //红包卡片
            if (msg.msgtype == 90 ) {

                if ( !body.url ) {

                    log.info('卡片链接', '外卖卡片无链接');
                    var fn = com.Promise(true, '外卖卡片无链接');

                } else {

                    // 发送卡片信息 类似小程序
                    var fn = this.wx.SendAppMsg(member.weixin_id, chat, '', 0, 5, '', '', body);

                    fn.then(ret => {

                        log.info('卡片消息', { 'member' : member.member_id, 'msgid' : ret.msgId, 'instance' : self.insid });

                    }).catch(err => {

                        self.sendErr(member, 'SendAppMsg', err, chat, body);
                    });
                }
            }

        }

        return fn;

    }

    /**
     * 转发出错了
     * @param integer 用户信息
     * @param string API名称
     * @param string 错误消息
     * @param string 微信群ID
     * @param string 内容
     */
    sendErr(user, api, err, chat, text) {

        //写入日志
        log.error(api, [user, err, chat, text]);

        //更新状态
        act.updatePushed(this.mysql, user, { api: api, err, chat });

        //群已经失效
        if (err == 'MM_ERR_NOTCHATROOMCONTACT' && typeof chat == 'string') {
            this.delGroup(user.member_id, user.weixin_id, chat);
        }

    }

}

module.exports = GroupsSend;