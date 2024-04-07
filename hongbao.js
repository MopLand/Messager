var bags = [

	{
		'msgtype': 47,
		'content': `<msg>
			<emoji fromusername="wxid_frgh4iv691jk22" tousername="8049512147@chatroom" type="2" idbuffer="media:0_0" md5="b678563ef6b7efb1b346bc6da6040e8a" len="181020" productid="" androidmd5="b678563ef6b7efb1b346bc6da6040e8a" androidlen="181020" s60v3md5="b678563ef6b7efb1b346bc6da6040e8a" s60v3len="181020" s60v5md5="b678563ef6b7efb1b346bc6da6040e8a" s60v5len="181020" cdnurl="http://emoji.qpic.cn/wx_emoji/lym8NlLVX3gUoFynz5lu5kASeMic6NXXyWuyGms627Z07wqfZK9ADZUCvOGXU0yVj/" designerid="" thumburl="" encrypturl="http://emoji.qpic.cn/wx_emoji/lym8NlLVX3gUoFynz5lu5kASeMic6NXXyWuyGms627Z04oAKGYUic7jnMS0TKCFkPf/" aeskey="545d84c316bf958cd293e95646037d58" externurl="http://emoji.qpic.cn/wx_emoji/GicyFVCQdyeV1kjWKnfcnNefkGW1l8ALl9DuaUfnfaKKM6uUrJDcs6dl6EsUzPX4j/" externmd5="b5ef9dc1931a2bd4dff23d0a1258c92d" width="640" height="71" tpurl="" tpauthkey="" attachedtext="" attachedtextcolor="" lensid="" emojiattr="" linkid=""></emoji>
		</msg>`
	},

	{
		'msgtype': 1,
		'quantum': [11,17],
		'content': '叮！吃饭时间到了，给你们准备好了紅包，快来领吧'
	},

	{
		'msgtype': 90,
		'subtype': 'meituan',
		'quantum': [23],
		'content': {
			"title": "【美团红包】免费领",
			"status": "on",
			"des": "今日可领红包9元/12元/18元，人人有份，速度领~",
			"api": "https://proxy.guodongbaohe.com/meituan/geturl?act_id=33&type=1",
			"thumburl": "https://static.baohe.rexcdn.com/sprite/mt.jpg"
		}
	},
	{
		'msgtype': 90,
		'subtype': 'elment',
		'quantum': [23],
		'content': {
			"title": "【饿了么外卖】第5个人领最大红包！",
			"status": "on",
			"des": "饿了么外卖升级，18元红包限时限量抢，手慢无~",
			"api": "http://proxy.guodongbaohe.com/builder/elePromotion?activity_id=10883",
			"thumburl": "https://static.baohe.rexcdn.com/sprite/ele.jpg"
		}
	},

	{
		'msgtype': 90,
		'subtype': 'meituan',
		'quantum': [11,17],
		'content': `<?xml version="1.0"?><msg>
			<appmsg appid="" sdkver="0">
				<title>【美团红包】免费领</title>
				<des>今日可领红包9元/12元/18元，人人有份，速度领~</des>
				<type>5</type>
				<action>view</action>
				<urlx>https://proxy.guodongbaohe.com/meituan/geturl?act_id=33&amp;type=1&amp;res_type=jump&amp;member_id={UID}</urlx>
				<url>http://xyz.f1url.com/share/channel/meituan?member_id={UID}</url>
				<appattach>
					<cdnthumbaeskey />
					<aeskey />
				</appattach>
				<thumburl>https://static.baohe.rexcdn.com/sprite/mt.jpg</thumburl>
				<webviewshared>
					<jsAppId><![CDATA[]]></jsAppId>
					<publisherReqId><![CDATA[0]]></publisherReqId>
				</webviewshared>
			</appmsg>
			<fromusername>filehelper</fromusername>
			<scene>0</scene>
			<appinfo>
				<version>1</version>
				<appname></appname>
			</appinfo>
			<commenturl></commenturl>
		</msg>`
	},
	{
		'msgtype': 90,
		'subtype': 'elment',
		'quantum': [11,17],
		'content': `<?xml version="1.0"?><msg>
			<appmsg appid="" sdkver="0">
				<title>【饿了么外卖】第5个人领最大红包！</title>
				<des>饿了么外卖升级，18元红包限时限量抢，手慢无~</des>
				<type>5</type>
				<action>view</action>
				<urlx>http://proxy.guodongbaohe.com/builder/elePromotion?activity_id=10883&amp;redirect=true&amp;member_id={UID}</urlx>
				<url>http://act.f2url.com/share/channel/ele?member_id={UID}</url>
				<appattach>
					<cdnthumbaeskey />
					<aeskey />
				</appattach>
				<thumburl>https://static.baohe.rexcdn.com/sprite/ele.jpg</thumburl>
				<webviewshared>
					<jsAppId><![CDATA[]]></jsAppId>
					<publisherReqId><![CDATA[0]]></publisherReqId>
				</webviewshared>
			</appmsg>
			<fromusername>filehelper</fromusername>
			<scene>0</scene>
			<appinfo>
				<version>1</version>
				<appname></appname>
			</appinfo>
			<commenturl></commenturl>
		</msg>`
	},

	{
		'msgtype': 90,
		'subtype': 'didi',
		'quantum': [23],
		'content': {
			"title": "【滴滴打车】限时领最大红包！",
			"status": "on",
			"des": "滴滴打车福利，超级红包限时限量抢，手慢无~",
			"api": "http://proxy.guodongbaohe.com/cps/didi?activity_id=207059212323&userid={UID}",
			"thumburl": "https://static.baohe.rexcdn.com/dt/img/dd/ddbloack_icon0.png"
		}
	},
	{
		'msgtype': 3,
		'quantum': [16],
		'rawdata': {
		  "existflag": 0,
		  "retcode": 0,
		  "filedata": "",
		  "ver": 0,
		  "seq": 322,
		  "filekey": "3eca5a61-f194-4e9c-ab86-1a5df7d3a3cc",
		  "recvlen": 174032,
		  "fileid": "3052020100044b304902010002041eaf1fef02033d14bc0204c7d7892b020466121598042433656361356136312d663139342d346539632d616238362d3161356466376433613363630204051830010201000400",
		  "midimglen": 61480,
		  "hittype": 0,
		  "retrysec": 0,
		  "isretry": 0,
		  "isoverload": 0,
		  "isgetcdn": 0,
		  "x-ClientIp": "1.14.157.73",
		  "aeskey": "87ee65b8f49011eeac44525400c6d6fc",
		  "md5": "d65fc53e7ef84a1988019049653036f4",
		  "filelen": 174022,
		  "thumbwidth": 112,
		  "thumbheight": 150,
		  "thumbtotalsize": 5073
		},
		'content': '<?xml version=\"1.0\"?><msg><img aeskey=\"87ee65b8f49011eeac44525400c6d6fc\" encryver=\"1\" cdnthumbaeskey=\"87ee65b8f49011eeac44525400c6d6fc\" cdnthumburl=\"3052020100044b304902010002041eaf1fef02033d14bc0204c7d7892b020466121598042433656361356136312d663139342d346539632d616238362d3161356466376433613363630204051830010201000400\" cdnthumblength=\"4141\" cdnthumbheight=\"150\" cdnthumbwidth=\"129\" cdnmidheight=\"0\" cdnmidwidth=\"0\" cdnhdheight=\"0\" cdnhdwidth=\"0\" cdnmidimgurl=\"3052020100044b304902010002041eaf1fef02033d14bc0204c7d7892b020466121598042433656361356136312d663139342d346539632d616238362d3161356466376433613363630204051830010201000400\" length=\"174022\" cdnbigimgurl=\"3052020100044b304902010002041eaf1fef02033d14bc0204c7d7892b020466121598042433656361356136312d663139342d346539632d616238362d3161356466376433613363630204051830010201000400\" hdlength=\"899896\" md5=\"d65fc53e7ef84a1988019049653036f4\" /><platform_signature></platform_signature><imgdatahash></imgdatahash></msg>'
	},

	{
		'msgtype': 1,
		'subtype': 'didi',
		'quantum': [16],
		'content': `滴滴打车券天天领
出行单单享优惠🚗
			
最高110元券包限时抢🧧
1⃣滴滴，优惠券包：https://v.didi.cn/p/ek0p7zW?source_id={UID}
			
2⃣花小猪，也有打车券咯！优惠券包：https://x.huaxz.cn/x/n9g7PZj?source_id={UID}`
	}

];

module.exports = bags;
