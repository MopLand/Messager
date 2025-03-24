var bags = [

	{
		'msgtype': 1,
		'quantum': [23],
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
		'quantum': [23],
		'content': `<?xml version="1.0"?><msg>
			<appmsg appid="" sdkver="0">
				<title>【美团红包】免费领</title>
				<des>今日可领红包9元/12元/18元，人人有份，速度领~</des>
				<type>5</type>
				<action>view</action>
				<url>http://xyz.f1url.com/share/channel/meituan?member_id={UID}</url>
				<appattach>
					<cdnthumburl>3057020100044b30490201000204777d344602032f5081020413eff98c020466814993042465383832393337382d353831362d343235632d383139342d3164373532323639336566660204051830010201000405004c51e500</cdnthumburl>
					<cdnthumbmd5>4397c6d1707e3e5fcc14225027b24961</cdnthumbmd5>
					<cdnthumblength>9357</cdnthumblength>
					<cdnthumbwidth>150</cdnthumbwidth>
					<cdnthumbheight>150</cdnthumbheight>
					<cdnthumbaeskey>c4e6826836d811efbb0100163e33f4ce</cdnthumbaeskey>
					<aeskey>c4e6826836d811efbb0100163e33f4ce</aeskey>
					<encryver>0</encryver>
					<filekey>e8829378-5816-425c-8194-1d7522693eff</filekey>
				</appattach>
				<thumburl>http://xyz.f1url.com/static/sprite/mt.jpg</thumburl>
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
		'quantum': [23],
		'content': `<?xml version="1.0"?><msg>
			<appmsg appid="" sdkver="0">
				<title>【饿了么外卖】第5个人领最大红包！</title>
				<des>饿了么外卖升级，18元红包限时限量抢，手慢无~</des>
				<type>5</type>
				<action>view</action>
				<url>http://act.f2url.com/share/channel/ele?member_id={UID}</url>
				<appattach>
					<cdnthumburl>3057020100044b30490201000204777d344602032f50810204d8eff98c020466814a88042462333334363633352d393233342d343264332d386362662d3363663038613338326536370204051830010201000405004c4d3500</cdnthumburl>
					<cdnthumbmd5>581a72c7b6a77a56f28b3ff702d75d0a</cdnthumbmd5>
					<cdnthumblength>20177</cdnthumblength>
					<cdnthumbwidth>150</cdnthumbwidth>
					<cdnthumbheight>150</cdnthumbheight>
					<cdnthumbaeskey>56be2cc236d911efbb0100163e33f4ce</cdnthumbaeskey>
					<aeskey>56be2cc236d911efbb0100163e33f4ce</aeskey>
					<encryver>0</encryver>
					<filekey>b3346635-9234-42d3-8cbf-3cf08a382e67</filekey>
				</appattach>
				<thumburl>http://act.f2url.com/static/sprite/ele.jpg</thumburl>
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
		'msgtype': 3,
		'quantum': [11,17],
		'content': `<?xml version="1.0"?><msg><img aeskey="09a9775b5a2e13333ae555c15d0feaf5" encryver="1" cdnthumbaeskey="09a9775b5a2e13333ae555c15d0feaf5" cdnthumburl="3057020100044b304902010002047269e0ca02032f7f6102041de6a03d02046699e3b8042433636266373861612d666565342d346361662d393537652d6338343466666431633531620204051818020201000405004c550500" cdnthumblength="15565" cdnthumbheight="150" cdnthumbwidth="150" cdnmidheight="0" cdnmidwidth="0" cdnhdheight="0" cdnhdwidth="0" cdnmidimgurl="3057020100044b304902010002047269e0ca02032f7f6102041de6a03d02046699e3b8042433636266373861612d666565342d346361662d393537652d6338343466666431633531620204051818020201000405004c550500" length="28530" md5="1d0078f1a0ba148be16c98fbd0959fc3" originsourcemd5="1d0078f1a0ba148be16c98fbd0959fc3" /><platform_signature /><imgdatahash /><ImgSourceInfo><ImgSourceUrl /><BizType>0</BizType></ImgSourceInfo></msg>`
	},
	
	{
		'msgtype': 1,
		'subtype': 'meituan',
		'quantum': [11,17],
		'content': `美团外卖，领外卖券📢

可领【15元】🧧，还有【9/8/3元券】

吃饱吃好，工作有劲儿！！
领取：http://x.f3url.com/oKVaP8?uid=0`
	},
	{
		'msgtype': 1,
		'subtype': 'elment',
		'quantum': [11,17],
		'content': `饿了么&外卖券📢

可领【6元/13元券】🧧

❶先领 城市消费券：http://x.f4url.com/MOW6es?uid=0

❷再点这里领：http://x.f4url.com/fqhPot?uid=0


省省省省钱！！！！`
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
		'msgtype': 47,
		'quantum': [16],
		'content': `<msg>
			<emoji fromusername="wxid_frgh4iv691jk22" tousername="8049512147@chatroom" type="2" idbuffer="media:0_0" md5="b678563ef6b7efb1b346bc6da6040e8a" len="181020" productid="" androidmd5="b678563ef6b7efb1b346bc6da6040e8a" androidlen="181020" s60v3md5="b678563ef6b7efb1b346bc6da6040e8a" s60v3len="181020" s60v5md5="b678563ef6b7efb1b346bc6da6040e8a" s60v5len="181020" cdnurl="http://emoji.qpic.cn/wx_emoji/lym8NlLVX3gUoFynz5lu5kASeMic6NXXyWuyGms627Z07wqfZK9ADZUCvOGXU0yVj/" designerid="" thumburl="" encrypturl="http://emoji.qpic.cn/wx_emoji/lym8NlLVX3gUoFynz5lu5kASeMic6NXXyWuyGms627Z04oAKGYUic7jnMS0TKCFkPf/" aeskey="545d84c316bf958cd293e95646037d58" externurl="http://emoji.qpic.cn/wx_emoji/GicyFVCQdyeV1kjWKnfcnNefkGW1l8ALl9DuaUfnfaKKM6uUrJDcs6dl6EsUzPX4j/" externmd5="b5ef9dc1931a2bd4dff23d0a1258c92d" width="640" height="71" tpurl="" tpauthkey="" attachedtext="" attachedtextcolor="" lensid="" emojiattr="" linkid=""></emoji>
		</msg>`
	},
	
	{
		'msgtype': 3,
		'quantum': [16],
		'rawdata': {
			"existflag": 0,
			"retcode": 0,
			"filedata": "",
			"ver": 0,
			"seq": 184,
			"filekey": "ad5fea15-ee0f-46ef-880c-a449640687a7",
			"recvlen": 280112,
			"fileid": "3052020100044b30490201000204079bc69702033d11fd0204bbbf66b4020467a7359b042461643566656131352d656530662d343665662d383830632d6134343936343036383761370204011438010201000400",
			"midimglen": 85086,
			"hittype": 0,
			"retrysec": 0,
			"isretry": 0,
			"isoverload": 0,
			"isgetcdn": 0,
			"x-ClientIp": "8.138.101.195",
			"aeskey": "f82f9940e3b215f7510d95b3684e2d07",
			"isHd": true,
			"md5": "015f7ab39353094f3ef2e62355a8bf46",
			"filelen": 280101,
			"thumbwidth": 83,
			"thumbheight": 150,
			"thumbtotalsize": 7802
		},
		'content': '<?xml version=\"1.0\"?><msg><img aeskey=\"f82f9940e3b215f7510d95b3684e2d07\" encryver=\"1\" cdnthumbaeskey=\"f82f9940e3b215f7510d95b3684e2d07\" cdnthumburl=\"3052020100044b30490201000204079bc69702033d11fd0204bbbf66b4020467a7359b042461643566656131352d656530662d343665662d383830632d6134343936343036383761370204011438010201000400\" cdnthumblength=\"7802\" cdnthumbheight=\"150\" cdnthumbwidth=\"83\" cdnmidimgurl=\"3052020100044b30490201000204079bc69702033d11fd0204bbbf66b4020467a7359b042461643566656131352d656530662d343665662d383830632d6134343936343036383761370204011438010201000400\" length=\"85086\" cdnbigimgurl=\"3052020100044b30490201000204079bc69702033d11fd0204bbbf66b4020467a7359b042461643566656131352d656530662d343665662d383830632d6134343936343036383761370204011438010201000400\" hdlength=\"280101\"></img></msg>'
	},

	{
		'msgtype': 1,
		'subtype': 'didi',
		'quantum': [16],
		'content': `滴滴打车券天天领
出行单单享优惠🚗
			
最高110元券包限时抢🧧
1⃣滴滴，优惠券包：https://v.didi.cn/p/edbQZwE?source_id={UID}
			
2⃣花小猪，也有打车券咯！优惠券包：https://x.huaxz.cn/x/05po91e?source_id={UID}`
	}

];

module.exports = bags;
