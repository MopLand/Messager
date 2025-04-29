var bags=[

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
		'msgtype': 47,
		'quantum': [11,17],
		'content': `<msg><emoji fromusername="wxid_xovtkbfqk01q22" tousername="23076885285@chatroom" type="2" idbuffer="media:0_0" md5="ed1609d430a91fc040f6c787a337e1a4" len="12649" productid="" androidmd5="ed1609d430a91fc040f6c787a337e1a4" androidlen="12649" s60v3md5="ed1609d430a91fc040f6c787a337e1a4" s60v3len="12649" s60v5md5="ed1609d430a91fc040f6c787a337e1a4" s60v5len="12649" cdnurl="http://vweixinf.tc.qq.com/110/20401/stodownload?m=ed1609d430a91fc040f6c787a337e1a4&amp;filekey=3043020101042f302d02016e0402535a0420656431363039643433306139316663303430663663373837613333376531613402023169040d00000004627466730000000132&amp;hy=SZ&amp;storeid=268109d930002390b3f7179bc0000006e01004fb1535a126d91515692f549b&amp;ef=1&amp;bizid=1022" designerid="" thumburl="" encrypturl="http://vweixinf.tc.qq.com/110/20402/stodownload?m=8250797f421d52452940696c057be3ce&amp;filekey=3043020101042f302d02016e0402535a0420383235303739376634323164353234353239343036393663303537626533636502023170040d00000004627466730000000132&amp;hy=SZ&amp;storeid=268109d930002ab033f7179bc0000006e02004fb2535a126d91515692f54a6&amp;ef=2&amp;bizid=1022" aeskey="f974f678c6f24ca0a7821e813f49123f" externurl="http://vweixinf.tc.qq.com/110/20403/stodownload?m=cdf07dc186977b17703af98e58450817&amp;filekey=3043020101042f302d02016e0402535a0420636466303764633138363937376231373730336166393865353834353038313702020eb0040d00000004627466730000000132&amp;hy=SZ&amp;storeid=268109d930003253c3f7179bc0000006e03004fb3535a126d91515692f54ad&amp;ef=3&amp;bizid=1022" externmd5="5f0e3bcbe2b54f24ffbe035d7de5df7d" width="200" height="200" tpurl="" tpauthkey="" attachedtext="" attachedtextcolor="" lensid="" emojiattr="" linkid="" desc="" ></emoji>  </msg>`
	},
	
	{
		'msgtype': 1,
		'subtype': 'meituan',
		'quantum': [11,17],
		'content': `美团外卖，领外卖券📢

可领【15元】🧧，还有【9/8/3元券】

吃饱吃好，工作有劲儿！！
领取：http://x.f1url.com/oKVaP8?uid=0`
	},
	{
		'msgtype': 1,
		'subtype': 'elment',
		'quantum': [11,17],
		'content': `饿了么&外卖券📢

可领【6元/13元券】🧧

❶先领 城市消费券：http://x.f2url.com/MOW6es?uid=0

❷再点这里领：http://x.f3url.com/fqhPot?uid=0


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
		'msgtype': 47,
		'quantum': [16],
		'content': `<msg><emoji fromusername="wxid_xovtkbfqk01q22" tousername="23076885285@chatroom" type="2" idbuffer="media:0_0" md5="7461282a8b1935f24c87719a5af2998d" len="28740" productid="" androidmd5="7461282a8b1935f24c87719a5af2998d" androidlen="28740" s60v3md5="7461282a8b1935f24c87719a5af2998d" s60v3len="28740" s60v5md5="7461282a8b1935f24c87719a5af2998d" s60v5len="28740" cdnurl="http://vweixinf.tc.qq.com/110/20401/stodownload?m=7461282a8b1935f24c87719a5af2998d&amp;filekey=3043020101042f302d02016e0402535a0420373436313238326138623139333566323463383737313961356166323939386402027044040d00000004627466730000000132&amp;hy=SZ&amp;storeid=268109f6500067e9f6c9c4d900000006e01004fb1535a257f01515696395f7&amp;ef=1&amp;bizid=1022" designerid="" thumburl="" encrypturl="http://vweixinf.tc.qq.com/110/20402/stodownload?m=6f02d40b0d372517469b727695085707&amp;filekey=3043020101042f302d02016e0402535a0420366630326434306230643337323531373436396237323736393530383537303702027050040d00000004627466730000000132&amp;hy=SZ&amp;storeid=268109f650006f3b36c9c4d900000006e02004fb2535a257f015156963960a&amp;ef=2&amp;bizid=1022" aeskey="d3161673ef804d8b9d98dae9e7af38c3" externurl="http://vweixinf.tc.qq.com/110/20403/stodownload?m=7155f16b2cb30e1d6330ba02f859c45d&amp;filekey=3043020101042f302d02016e0402535a0420373135356631366232636233306531643633333062613032663835396334356402021630040d00000004627466730000000132&amp;hy=SZ&amp;storeid=268109f6500077eb56c9c4d900000006e03004fb3535a257f015156963961d&amp;ef=3&amp;bizid=1022" externmd5="a4d99e5f21aa88717465dfa11a691d68" width="400" height="400" tpurl="" tpauthkey="" attachedtext="" attachedtextcolor="" lensid="" emojiattr="" linkid="" desc="" ></emoji>  </msg>`
	},

	{
		'msgtype': 1,
		'subtype': 'didi',
		'quantum': [16],
		'content': `滴滴打车券天天领
出行单单享优惠🚗
			
最高110元券包限时抢🧧
1⃣滴滴，优惠券包：https://v.didi.cn/p/oRdl3XG?source_id={UID}
			
2⃣花小猪，也有打车券咯！优惠券包：https://x.huaxz.cn/x/05po91e?source_id={UID}`
	}

];

module.exports=bags;
