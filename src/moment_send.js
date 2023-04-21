'use strict'

/**
 * 朋友圈控制器
 */

const fs = require('fs');
const wx = require('../lib/weixin');
const com = require('../lib/common');
const req = require('../lib/request');
const act = require('../lib/activity');
const Logger = require('../lib/logger');
const tag = com.fileName(__filename, false);
const log = new Logger(tag);

class MomentSend {

    /**
     * 构造函数
     */
    constructor(conf) {
        this.inst = {};
        this.conf = conf;
        this.wx = new wx(conf.weixin, conf.reserve, conf.special);
        this.redis = com.redis(conf.redis);
        this.sider = com.redis(conf.redis);
        this.mysql = com.mysql(conf.mysql, (db => { this.mysql = db; }).bind(this));
        this.delay = [];
        this.twice = {};
        this.abort = false;
    }

    init(item = 'moment_send') {

        var self = this;
        var conf = this.conf;
        var inst = this.conf[item];

        //Redis消息频道（mm_moment_send || mm_moment_mtl）
        var channel = 'mm_' + item;

        ///////////////

        //当前 PM2 实例数量
		let pwd = process.cwd();
        let txt = fs.readFileSync(pwd + '/run/'+ item +'.json');
        let set = JSON.parse(txt);

		//实例ID，PM2 分流
		this.nodes = set.instances || 1;
        this.insid = process.env.NODE_APP_INSTANCE || 0;

        //log.info( 'Process', process.env );
        log.info( '应用实例', '实例数量 ' + this.nodes + '，当前实例 ' + this.insid );

        ///////////////

        this.item = item;
        this.inst = inst;

        //消息筛选条件
        var where = {};

        //订阅消息发送
        this.subscribe(channel, where);

    }

    /**
     * 订阅消息
     * @param string 消息频道
     * @param object 消息过滤
     */
    subscribe(channel, where) {

        let self = this;

        //处理 Redis 消息
        this.redis.on('message', function (channel, message) {

            let recv = JSON.parse(message);

            if ( self.nodes == 1 && self.insid > 0 ) {
                log.info('实例错误', '实例数量与实例不匹配');
                return;
            }

            log.info('原始消息', recv);

			let post = {
				id: recv.postid,
				forced: recv.forced,
				userName: recv.weixin,
                objectDesc: { string: recv.subject },
                commentUserList: recv.comment
            }

			self.send(post, recv.testing);

			//act.record(self.mysql, self.item, post, '发圈消息');

        });

        //订阅 Redis 频道消息
        this.redis.subscribe(channel);

    }

    /**
     * 循环发送朋友圈
     * @param object post 朋友圈消息
     * @param boolean testing 是否为测试消息
     */
    send(post, testing = false) {

        var self = this;
        var time = com.getTime() - self.conf.active;
        var data = self.parseMoment(post);

        // 72 小时前时间
        var last = com.strtotime('-3 day');
        var date = new Date(last * 1000).format('yyyyMMdd');
		
		// 文件锁名称
		var lock = self.item + ( post.userName ? '_' + post.userName : '' );

        //取消中断
        self.abort = false;

        var func = (auto) => {

            //锁定 GIT
            if (auto == 0) {
                com.locked( lock );
            }

            //let fld = [ 'moment', 'moment_send' ].indexOf(self.item) > -1 ? 'moment' : 'moment_mtl';
            let sql = 'SELECT w.`auto_id`, w.`member_id`, w.`weixin_id`, w.`tag`, m.`invite_code` '
					+ 'FROM `pre_weixin_list` AS w LEFT JOIN `pre_member_list` AS m ON w.`member_id` = m.`member_id` '
					+ 'WHERE w.online = 1 AND w.auto_id > ? AND w.created_date <= ? ';
			let req = [auto, date];

			if ( self.item == 'moment_send' && !post.forced ) {
				sql += ' AND FIND_IN_SET( ?, lookids )';
				req.push(post.userName);
			}

			if ( self.item == 'moment_send' ) {
				sql += ' AND w.moment = 1';
			}

			if ( self.item == 'moment_mtl' ) {
				sql += ' AND w.moment_mtl = 1';
			}

			if ( self.nodes > 1 ) {
				sql += " AND auto_id % ? = ?";
				req.push(self.nodes, self.insid);
			}

			sql += ' ORDER BY w.auto_id ASC LIMIT 100';

            self.mysql.query(sql, req, function (err, res) {

                if (err) {
                    return log.error('读取错误', err);
                }

                //发送完成，解锁 GIT
                if (res.length == 0) {
                    com.unlock( lock );
                    //act.record(self.mysql, lock, { 'heartbeat_time': time, 'auto_id': auto }, '发送完成');
                    return log.info('处理完毕', time);
                } else {
                    //act.record(self.mysql, lock, { 'quantity': res.length, 'members': res }, '批次用户');
                    log.info('本次发圈', res.length + ' 人，评论 ' + data.comment.length + ' 条，位置 ' + auto);
                }

                for (var i = 0; i < res.length; i++) {

                    if (self.item == 'moment_mtl' && res[i] && res[i].tag && (res[i].tag & 8)) {
                        continue;
                    }

                    // 测试号只记录10天数据
                    if (testing && i >= 10 ) {
                        break;
                    }

                    //预处理评论，再转发朋友圈
                    self.parseComment(res[i], data, testing);

                    // 不为测试消息时更新发圈时间
                    if (!testing) {
                        self.mysql.query('UPDATE `pre_weixin_list` SET moment_send = IF( DATEDIFF(NOW(), FROM_UNIXTIME(moment_time) ) > 0, 0, moment_send ) + 1, moment_time = UNIX_TIMESTAMP() WHERE member_id = ? AND weixin_id = ?', [res[i].member_id, res[i].weixin_id]);
                    }

                }

                if (testing) {
                    com.unlock( lock );
                    return log.info('测试完毕', time);
                } else {
                    //再次执行，传入最后ID
                    setTimeout(() => { func(res[i - 1].auto_id); }, 2000);
                }

            });

        };

        //开始执行
        data.sending && func(0);
    }

    /**
     * 预处理朋友圈
     * @param object 发圈数据
     */
    parseMoment(post) {

        var conf = this.inst;

        //构造数据包
        var data = {
            //内容主体
            subject: post.objectDesc.string,

			//源头圈ID
			sourced: post.userName,

            //是否发送
            sending: true,

            //是否转链
            convert: 0,

            //评论列表，{ exch, type, text }
            comment: [],

			//朋友圈消息包id
			package: post.id,

			//创建时间
			created: com.getTime(),
        }

        //需要忽略的发圈
        if (post.commentUserList) {

            for (let i = 0; i < post.commentUserList.length; i++) {

                let type = post.commentUserList[i].type;
                let text = post.commentUserList[i].content;
                let keep = post.commentUserList[i].fixedly;
                let comm = text.toLocaleUpperCase();
                let exch = false;

				//忽略标识符
                if (comm == conf.ignore) {
                    data.sending = false;
                    log.info('跳过发圈', comm);
                }

				//原样标识符
                if (conf.origin && conf.origin.test(comm)) {
                    data.convert = 0;
                    log.info('不要转链', comm);
                } else if( !keep ) {
                    exch = act.extractTbc(text) || act.detectUrl(text) || act.detectApp(text);
                    exch && data.convert ++;
                }

                data.comment.push({ exch, type, text });
            }
        }

        log.info('发圈数据', data);
        return data;
    }

    /**
     * 预处理评论
     * @param object 用户数据
     * @param object 发圈数据
     * @param integer 延迟时间
     * @param string 解析商品
     */
    parseComment(member, params, testing = false, lazy_time = 0, product = 'true') {

        var self = this;
        var data = com.clone(params);
        var size = data.comment.length;

        var parse = (i) => {

			//可能存在无评论情况
            let comm = data.comment[i] || {};

            // 判断个人商城链接
            if ( !comm.noreplace ) {
                //log.info('邀请码', [member.member_id, member.invite_code, comm]);
                comm.text = act.replaceUserid(comm.text, member.member_id);
                comm.text = act.replaceInvite(comm.text, member.invite_code);
            }

            let misc = comm.exch ? act.getExternal(comm.text) : '';

            //转链
            req.get(self.conf.convert, { 'member_id': member.member_id, 'text': comm.text, 'product': product, 'lazy_time': lazy_time, 'weixin': data.sourced, 'source': 'yfd', 'external': misc }, (code, body) => {

                try {
                    if (typeof body == 'string') {
                        body = JSON.parse(body);
                    }
                } catch (e) {
                    body = { 'status': -code, 'body': body, 'error': e.toString() };
                }

                log.info('转链结果', [member.member_id, body, lazy_time]);

                ///////////////

                //成功转链数量 或 没有失败（原样返回）
                if ( body.status > 0 || ( body.status == body.fail && body.fail == 0 ) ) {

                    comm.text = body.result;
                    comm.product = body.product;

                    if ( i >= (size - 1) ) {
                        // 最后一个评论转链成功
                        if (testing) {
                            act.record(self.mysql, self.item + '_test', { 'member': member, 'data': data.comment }, '测试发送');
                        } else {
                            self.forwardMoment(member, data);
                        }
                    } else {
                        parse(++i);
                    }

                } else {

                    body.err = '转链失败';
                    body.source = 'moment';

                    let beian = body.special && 'beian' == body.special;

                    if (testing) {
                        act.record(self.mysql, self.item + '_test', { 'member': member, 'data': body }, '转链失败');
                    } else {
                        act.updatePushed(self.mysql, member, body);
                        log.error('转链失败', [member.weixin_id, lazy_time, beian]);
                    }
                }

            }, (data) => {

                //是口令，需要转链
                if (comm.exch && (member.tag & 4) == 0) {
                    return { 'request': true };
                } else {
                    return { 'request': false, 'respond': { 'status': 1, 'result': data.text } };
                }

            }, self.conf.options);
        }

        parse(0);
    }

    /**
     * 转发朋友圈
     * @param object 用户数据
     * @param object 发圈数据
     */
    forwardMoment(member, data) {

        let self = this;
		let post = com.clone(data);

        let pm = this.wx.SnsPostXml(member.weixin_id, post.subject);

        pm.then(ret => {

			if( ret.snsObject.id ){

				this.forwardComment(member, post, ret.snsObject.id);

            	log.info('发圈成功', { 'weixin_id' : member.weixin_id, 'package' : post.package, 'post_id' : ret.snsObject.id });

			}else{

				log.debug('发圈异常', { 'weixin_id' : member.weixin_id, 'package' : post.package, 'result' : ret });

			}

        }).catch(err => {

            let body = { api: 'SnsPostXml', err, isAbort: false };

            //判定为垃圾消息
            if (typeof err == 'string' && self.inst.cancel) {

				let ret = err.match(self.inst.cancel);

                if ( ret ) {

                    self.abort = ret[0];

                    // 营销素材 判定为垃圾消息则禁发素材
                    if (self.item == 'moment_mtl') {
                        body.isAbort = true;
                    }
                }
            }

            log.error('发圈出错', {'weixin_id': member.weixin_id, 'package' : post.package, 'member_id': member.member_id, 'error' : err });
            act.updatePushed(self.mysql, member, body);

        });

        return pm;
    }

    /**
     * 转发评论
     * @param object 用户数据
     * @param object 发圈数据
     * @param integer 发圈ID
     * @param integer 延迟时间
     */
    async forwardComment(member, data, post_id, lazy_time = 0) {

        var self = this;

        for (let i = 0; i < data.comment.length; i++) {

            let comm = data.comment[i];
            let last = i == data.comment.length - 1;

			//适当延迟，保证评论顺序
            //if (!last && comm.exch) {
			//if ( !last ) {
				await com.sleep(2000);
			//}

            //评论
            let pm = self.wx.SnsComment(member.weixin_id, post_id, comm.type, comm.text);

            pm.then(ret => {

                log.info('评论成功', { 'weixin_id': member.weixin_id, 'package' : data.package, 'index' : i, 'text' : comm.text });
                log.info('解析商品', comm.product);

				//写入发单效果，仅限有源商品
                if ( ['moment_send', 'moment'].indexOf(self.item) > -1 && comm.product && data.sourced ) {
					for (let k in comm.product) {
						act.collect(self, 'moment', {
							"platform": comm.product[k],
							"item_id": k,
						}, data, { [data.sourced] : ret.snsObject.createTime });
					}
                }

            }).catch(err => {

                log.error('评论失败', { 'weixin_id': member.weixin_id, 'package' : data.package, 'post_id' : post_id, 'index' : i, 'lazy_time' : lazy_time, 'error' : err });
                act.updatePushed(self.mysql, member, { api: 'SnsComment', act: 'text', txt: comm.text, err });

                ////////

				//三分钟后，再尝试一次
				if( lazy_time == 0 && post_id ){
					
					let time = com.getTime();
                    let span = 60 * 1000 * 3;

                    setTimeout(() => { self.forwardComment(member, data, post_id, time); }, span);

				}else{

					setTimeout(() => {
						self.wx.SnsObjectOp(member.weixin_id, post_id, 1);
						log.error('删除发圈', { 'weixin_id': member.weixin_id, 'post_id' : post_id, 'lazy_time': lazy_time });
					}, 5000);

				}
				
            });

        }
    }
}

module.exports = MomentSend