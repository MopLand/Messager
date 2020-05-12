/**
 * 微信客户端类
 */

const Request = require('../lib/request');
 
class Weixin{

    /**
     * 构造函数
     */
    constructor( host )
    {
        this.host = host;
    }

    /**
     * FollowPublicAccount 关注公众号 
     * @param string wxId 微信Id  必填True 
     * @param string appId 公众号AppId  必填True 
     */
    FollowPublicAccount( wxId, appId )
    {
		var api = 'Common/FollowPublicAccount';
		var ret = { appId, wxId };
        return this.request( api, ret, cb );
    }


    /**
     * ReadArticle 阅读文章  
     * @param string wxId 微信Id  必填True 
     * @param string url 文章的url  必填True 
     * @param string userName userName  必填False
     */
    ReadArticle( $wxId, $url, $userName = '')
     {
        var api = 'Common/ReadArticle';
        $data = compact('url', 'wxId', 'userName');
        return this.request( api, data );
    }


    /**
     * LikeArticle 点赞文章 
     * @param string wxId 微信Id  必填True 
     * @param string url 文章的url  必填True 
     * @param string userName userName  必填False 
     */
    LikeArticle( $wxId, $url, $userName = '')
     {
        var api = 'Common/LikeArticle';
        $data = json_encode(compact('userName', 'url', 'wxId'));
        return this.request( api, data );
    }


    /**
     * GetSharkItOff 摇一摇 
     * @param string wxId 微信Id  必填True 
     * @param float longitude 经度  必填True 
     * @param float latitude 纬度  必填True 
     */
    GetSharkItOff( $wxId, $longitude, $latitude)
     {
        var api = 'Common/GetSharkItOff';
        $data = compact('longitude', 'latitude', 'wxId');
        return this.request( api, data );
    }


    /**
     * GetA8Key GetA8Key 
     * @param string wxId 微信Id  必填True 
     * @param string url 文章的url  必填True 
     * @param string userName userName  必填False 
     */
    GetA8Key( $wxId, $url, $userName = '')
     {
        var api = 'Common/GetA8Key';
        $data = compact('userName', 'url', 'wxId');
        return this.request( api, data );
    }


    /**
     * GetMpA8Key GetMpA8Key  
     * @param string wxId 微信Id  必填True 
     * @param string url 文章的url  必填True
     * @param string userName userName  必填False 
     */
    GetMpA8Key( $wxId, $url, $userName = '')
     {
        var api = 'Common/GetMpA8Key';
        $data = compact('url', 'wxId', 'userName');
        return this.request( api, data );
    }


    /**
     * getSafeDevice 获取安全设备 
     * @param string wxId   必填True 
     */
    getSafeDevice( $wxId)
     {
        var api = 'Device/getSafeDevice/'+ $wxId;
        return this.request( api );
    }


    /**
     * DelSafeDevice 删除安全设备  
     * @param string wxId 微信Id  必填True 
     * @param string uuid 设备uuid  必填True
     */
    DelSafeDevice( $wxId, $uuid)
     {
        var api = 'Device/DelSafeDevice';
        $data = compact('uuid', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * FavSync 同步收藏 
     * @param string wxId 微信Id  必填True 
     * @param string keyBuf 二进制流  必填False 
     */
    FavSync( $wxId, $keyBuf = '')
     {
        var api = 'Favor/FavSync';
        $data = compact('keyBuf', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * GetFavItem 获取单条收藏 
     * @param string wxId 微信Id  必填True 
     * @param integer favId 收藏Id  必填True 
     */
    GetFavItem( $wxId, $favId)
     {
        var api = 'Favor/GetFavItem/'+ $wxId +'/' + $favId;
        return this.request( api );
    }        
    
    /**
     * DelFavItem 删除收藏 
     * @param string wxId 微信Id  必填True 
     * @param array favIds 收藏id列表  必填True 
     */
    DelFavItem( $wxId, $favIds)
     {
        var api = 'Favor/DelFavItem';
        $data = compact('favIds', 'wxId');
        return this.request( api, data );
    }        
    
    /**
     * AddFavItem 添加收藏  
     * @param string wxId 微信Id  必填True 
     * @param string object 组装的xml数据 <favitem type="1"><desc>我通过了你的朋友验证请求，现在我们可以开始聊天了</desc><source sourcetype="1" sourceid="2252832101216037513"><fromusr>wxid_ccl6h2zrd7rl12</fromusr><tousr>wxid_xqyjnvihzqyn12</tousr><msgid>2252832101216037513</msgid></source></favitem>  必填True 
     * @param string sourceId 来源Id  必填True
     */
    AddFavItem( $wxId, $object, $sourceId)
     {
        var api = 'Favor/AddFavItem';
        $data = compact('object', 'sourceId', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * Search 搜索联系人 
     * @param string WxId 微信Id  必填True 
     * @param string SearchWxName 手机号，微信号，QQ号  必填True 
     */
    Search( $WxId, $SearchWxName)
     {
        var api = 'Friend/Search/'+ $wxId +'/' + $SearchWxName;
        return this.request( api );
    }
        
    
    /**
     * AddFriendRequest 发送好友请求 
     * @param string wxId 微信Id  必填True 
     * @param string userNameV1 添加微信好友用户V1数据  必填True 
     * @param string antispamTicket 添加微信好友用户的票证数据  必填True 
     * @param integer origin 来源 1来源QQ2来源邮箱3来源微信号14群聊15手机号18附近的人25漂流瓶29摇一摇30二维码13来源通讯录  必填True 
     * @param string content 内容  必填False 
     */
    AddFriendRequest( $wxId, $userNameV1, $antispamTicket,  $origin, $content)
     {
        var api = 'Friend/AddFriendRequest';
        $data = compact('userNameV1', 'antispamTicket', 'content', 'origin', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * AddFriendRequestList 批量添加好友  
     * @param string wxId 微信Id  必填True 
     * @param integer origin 来源 1来源QQ2来源邮箱3来源微信号14群聊15手机号18附近的人25漂流瓶29摇一摇30二维码13来源通讯录  必填True 
     * @param string content 内容  必填False
     * @param array friends 好友列表  必填False 
     */
    AddFriendRequestList( $wxId,  $origin, $content = '', $friends = [])
     {
        var api = 'Friend/AddFriendRequestList';
        $data = compact('content', 'origin', 'friends', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * UploadContrats 上传通讯录
     * @param string wxId 微信Id  必填True  
     * @param array phoneNos 上传手机号码列表  必填True 
     * @param string currentPhoneNo 当前手机号码  必填False 
     */
    UploadContrats( $wxId, $phoneNos, $currentPhoneNo = '')
     {
        var api = 'Common/UploadContrats';
        $data = compact('currentPhoneNo', 'phoneNos', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * GetContractList 获取通讯录好友(精准) 
     * @param string wxId 微信Id  必填True 
     * @param integer currentWxcontactSeq 好友分页  必填False 
     * @param integer currentChatRoomContactSeq 群分页  必填False 
     */
    GetContractList( $wxId,  $currentWxcontactSeq = 0,  $currentChatRoomContactSeq = 0)
     {
        var api = 'Friend/GetContractList';
        $data = compact('currentWxcontactSeq', 'currentChatRoomContactSeq', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * GetContractDetail 获取通讯录好友详情(一次不要超过10个) 
     * @param string wxId 微信Id  必填True 
     * @param array searchWxIds 搜索的好友列表  必填True 
     */
    GetContractDetail( $wxId, $searchWxIds)
     {
        var api = 'Friend/GetContractDetail';
        $data = compact('searchWxIds', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * BatchGetProfile 批量获取好友简介(一次不要超过10个) 
     * @param string wxId 微信Id  必填True 
     * @param array searchWxIds 搜索好友的微信Id  必填True 
     */
    BatchGetProfile( $wxId, $searchWxIds)
     {
        var api = 'Friend/BatchGetProfile';
        $data = compact('searchWxIds', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * BatchGetHeadImg 批量获取微信头像(一次不要超过10个) 
     * @param string wxId 微信Id  必填True 
     * @param array searchWxIds 微信Id列表  必填True 
     */
    BatchGetHeadImg( $wxId, $searchWxIds)
     {
        var api = 'Friend/BatchGetHeadImg';
        $data = compact('searchWxIds', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * PassFriendVerify 通过好友验证  
     * @param string wxId 微信Id  必填True  
     * @param string userNameV1 添加微信好友用户V1数据  必填True 
     * @param string antispamTicket 添加微信好友用户的票证数据  必填True
     * @param integer origin 来源 1来源QQ2来源邮箱3来源微信号14群聊15手机号18附近的人25漂流瓶29摇一摇30二维码13来源通讯录  必填True
     * @param string content 内容  必填False 
     */
    PassFriendVerify( $wxId, $userNameV1, $antispamTicket,  $origin, $content = '')
     {
        var api = 'Friend/PassFriendVerify';
        $data = compact('userNameV1', 'antispamTicket', 'content', 'origin', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * RejectFriendVerify 拒绝好友验证 
     * @param string wxId 微信Id  必填True 
     * @param string userNameV1 添加微信好友用户V1数据  必填True 
     * @param string antispamTicket 添加微信好友用户的票证数据  必填True 
     * @param integer origin 来源 1来源QQ2来源邮箱3来源微信号14群聊15手机号18附近的人25漂流瓶29摇一摇30二维码13来源通讯录  必填True 
     * @param string content 内容  必填False 
     */
    RejectFriendVerify( $wxId, $userNameV1, $antispamTicket,  $origin, $content)
     {
        var api = 'Friend/RejectFriendVerify';
        $data = compact('userNameV1', 'antispamTicket', 'content', 'origin', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * DeleteFriend 删除好友 
     * @param string wxId 微信Id  必填True 
     * @param string toWxId 删除的 微信Id  必填True 
     */
    DeleteFriend( $wxId, $toWxId)
     {
        var api = 'Friend/DeleteFriend';
        $data = compact('toWxId', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * BatchDeleteFriend 批量删除好友 
     * @param string wxId 微信Id  必填True 
     * @param array deleteWxIds 删除好友的微信Id  必填True 
     */
    BatchDeleteFriend( $wxId, $deleteWxIds)
     {
        var api = 'Friend/BatchDeleteFriend';
        $data = compact('deleteWxIds', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * SetFriendRemark 设置好友备注 
     * @param string wxId 微信Id  必填True 
     * @param string toWxId 好友wxid;  必填True 
     * @param string remark 备注;  必填True 
     */
    SetFriendRemark( $wxId, $toWxId, $remark)
     {
        var api = 'Friend/SetFriendRemark';
        $data = compact('toWxId', 'remark', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * GetPeopleNearby 附近的人  
     * @param string wxId 微信Id  必填True 
     * @param number longitude 经度  必填False 
     * @param number latitude 纬度  必填False
     */
    GetPeopleNearby( $wxId, $longitude = 0, $latitude = 0)
     {
        var api = 'Friend/GetPeopleNearby';
        $data = compact('longitude', 'latitude', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * GetFriendCircleDetail 获取特定人朋友圈 
     * @param string wxId 微信Id  必填True 
     * @param string toWxId 查询人的微信朋友圈  必填True 
     * @param integer maxid 首页为0 次页朋友圈数据id 的最小值  必填True 
     */
    GetFriendCircleDetail( $wxId, $toWxId, $maxid)
     {
        var api = 'FriendCircle/GetFriendCircleDetail';
        $data = compact('toWxId', 'maxid', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * GetFriendCircleList 获取自己朋友圈列表 
     * @param string wxId 微信Id  必填True
     * @param string fristPageMd5 分页Md5  必填False 
     * @param integer id Id  必填False  
     */
    GetFriendCircleList( $wxId, $fristPageMd5 = '',  $id = 0)
     {
        var api = 'FriendCircle/GetFriendCircleList';
        $data = compact('fristPageMd5', 'id', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * SyncFriendCircle 同步朋友圈 
     * @param string wxId 微信Id  必填True 
     */
    SyncFriendCircle( $wxId)
     {
        var api = 'FriendCircle/SyncFriendCircle/'+ $wxId;
        return this.request( api, data );
    }
        
    
    /**
     * SendFriendCircle 发送朋友圈 
     * @param string wxId 微信Id  必填True 
     * @param integer type 0:文字 1：图片 2视频(支持20m以内长视频) 3：链接 7：xml格式(填写到content中)  必填True 
     * @param array blackList 黑名单wxId用户列表  必填False 
     * @param array withUserList 标记的Wxid列表  必填False 
     * @param array mediaInfos media列表  必填False 
     * @param string title 标题  必填False 
     * @param string contentUrl 内容的链接  必填False 
     * @param string description 描述  必填False 
     * @param string content 内容  必填False 
     */
    SendFriendCircle( $wxId,  $type, $blackList = [], $withUserList = [], $mediaInfos = [], $title = '', $contentUrl = '', $description = '', $content = '')
     {
        var api = 'FriendCircle/SendFriendCircle';
        $data = compact('type', 'blackList', 'withUserList', 'mediaInfos', 'title', 'contentUrl', 'description', 'content', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * SendFriendCircleImage 上传朋友圈图片 
     * @param string wxId 微信Id  必填True 
     * @param array base64s oss ObjectName  必填True 
     */
    SendFriendCircleImage( $wxId, $base64s)
     {
        var api = 'FriendCircle/SendFriendCircleImage';
        $data = compact('base64s', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * SetFriendCircle 操作朋友圈 1删除朋友圈2设为隐私3设为公开4删除评论5取消点赞  
     * @param string wxId 微信Id  必填True 
     * @param integer id 朋友圈Id  必填True 
     * @param integer type 朋友圈类型 1删除朋友圈2设为隐私3设为公开4删除评论5取消点赞  必填True
     */
    SetFriendCircle( $wxId,  $id,  $type)
     {
        var api = 'FriendCircle/SetFriendCircle';
        $data = compact('id', 'type', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * SendFriendCircleComment 发送评论 点赞  
     * @param string wxId 微信Id  必填True 
     * @param integer id 朋友圈Id  必填True 
     * @param integer type 类型 1点赞 2：文本 3:消息 4：with 5陌生人点赞  必填True 
     * @param string content 内容  必填False 
     * @param integer replyCommnetId 回复评论Id  必填False
     */
    SendFriendCircleComment( $wxId,  $id,  $type, $content = '',  $replyCommnetId = 0)
     {
        var api = 'FriendCircle/SendFriendCircleComment';
        $type = 'post';
        $data = compact('id', 'type', 'content', 'replyCommnetId', 'wxId');
        if ($content == '') unset($data['content']);
        if ($replyCommnetId == 0) unset($data['replyCommnetId']);
        return this.request( api, data );
    }
        
    
    /**
     * CreateGroup 创建群 
     * @param string wxId 微信Id  必填True 
     * @param string groupName 群名称  必填True 
     * @param array toWxIds 群成员  必填True 
     */
    CreateGroup( $wxId, $groupName, $toWxIds)
     {
        var api = 'Group/CreateGroup';
        $data = compact('groupName', 'toWxIds', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * AddGroupMember 添加群成员(40人以内) 
     * @param string wxId 微信Id  必填True 
     * @param string chatRoomName 群Id  必填True 
     * @param array toWxIds 群成员  必填True 
     */
    AddGroupMember( $wxId, $chatRoomName, $toWxIds)
     {
        var api = 'Group/AddGroupMember';
        $data = compact('chatRoomName', 'toWxIds', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * InviteChatRoomMember 邀请群成员(40人以上) 
     * @param string wxId 微信Id  必填True 
     * @param string chatRoomName 群Id  必填True 
     * @param array toWxIds 群成员  必填True 
     */
    InviteChatRoomMember( $wxId, $chatRoomName, $toWxIds)
     {
        var api = 'Group/InviteChatRoomMember';
        $data = compact('chatRoomName', 'toWxIds', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * DeleteGroupMember 删除群成员 
     * @param string wxId 微信Id  必填True 
     * @param string chatRoomName 群Id  必填True 
     * @param array toWxIds 群成员  必填True 
     */
    DeleteGroupMember( $wxId, $chatRoomName, $toWxIds)
     {
        var api = 'Group/DeleteGroupMember';
        $data = compact('chatRoomName', 'toWxIds', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * GetGroupMembers 获取群成员资料 
     * @param string wxId 微信Id  必填True 
     * @param string chatRoomName 群Id  必填True 
     */
    GetGroupMembers(  $wxId, $chatRoomName)
     {
        var api = 'Group/GetGroupMembers';
        $data = compact('chatRoomName', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * QuitGroup 退出群 
     * @param string wxId 微信Id  必填True 
     * @param string chatRoomName 群Id  必填True 
     */
    QuitGroup( $wxId, $chatRoomName)
     {
        var api = 'Group/QuitGroup';
        $data = compact('chatRoomName', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * TransferChatRoomOwner 移交群管理 
     * @param string chatRoomName 群Id  必填True 
     * @param string toWxId 移交微信Id  必填True 
     * @param string wxId 微信Id  必填True 
     */
    TransferChatRoomOwner( $wxId, $chatRoomName, $toWxId)
     {
        var api = 'Group/TransferChatRoomOwner';
        $data = compact('chatRoomName', 'toWxId', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * GetChatRoomAnnouncement 获取群公告 
     * @param string wxId 微信Id  必填True 
     * @param string chatRoomName 群Id  必填True 
     */
    GetChatRoomAnnouncement(  $wxId, $chatRoomName)
     {
        var api = 'Group/GetChatRoomAnnouncement';
        $data = compact('chatRoomName', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * UpdateGroupAnnouncement 修改公告 
     * @param string wxId 微信Id  必填True 
     * @param string chatRoomName 群Id  必填True 
     * @param string announcement 公告  必填True 
     */
    UpdateGroupAnnouncement( $wxId, $chatRoomName, $announcement)
     {
        var api = 'Group/UpdateGroupAnnouncement';
        $data = compact('chatRoomName', 'announcement', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * GetQrCode 获取群二维码 
     * @param string wxId   必填True 
     * @param string groudID   必填True 
     */
    GetQrCode( $wxId, $groudID)
     {
        var api = 'Group/GetQrCode/'+ $wxId +'/' + $groudID;
        return this.request( api );
    }
        
    
    /**
     * GetChatRoomInfoDetail 获取群详情  
     * @param string wxId 微信Id  必填True 
     * @param string chatRoomName 群Id  必填True
     */
    GetChatRoomInfoDetail( $wxId, $chatRoomName)
     {
        var api = 'Group/GetChatRoomInfoDetail';
        $data = compact('chatRoomName', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * ScanIntoGroup 扫码进群(url) 
     * @param string wxId 微信Id  必填True 
     * @param string url 扫码进群Url  必填True 
     */
    ScanIntoGroup( $wxId, $url)
     {
        var api = 'Group/ScanIntoGroup';
        $data = compact('url', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * ScanIntoGroupBase64 扫码进群(二维码) 
     * @param string wxId 微信Id  必填True 
     * @param string base64 扫码进群base64  必填True 
     */
    ScanIntoGroupBase64( $wxId, $base64)
     {
        var api = 'Group/ScanIntoGroupBase64';
        $data = compact('base64', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * GetLableList 获取标签列表 
     * @param string wxId 微信Id  必填True 
     */
    GetLableList( $wxId)
     {
        var api = 'Label/GetLableList/' + $wxId;
        return this.request( api );
    }
        
    
    /**
     * AddLabelName 添加标签 
     * @param string wxId 微信Id  必填True 
     * @param string labelName 标签名称  必填True 
     */
    AddLabelName( $wxId, $labelName)
     {
        var api = 'Label/AddLabelName';
        $data = compact('labelName', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * BatchUpdateLabelName 批量修改标签 
     * @param string wxId 微信Id  必填True 
     * @param array labelInfos 标签信息  必填True 
     */
    BatchUpdateLabelName( $wxId, $labelInfos)
     {
        var api = 'Label/BatchUpdateLabelName';
        $data = compact('labelInfos', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * UpdateLabelName 修改标签 
     * @param string wxId 微信Id  必填True 
     * @param string toWxId 配置的微信Id  必填True 
     * @param string labelIDList 标签Id列表  必填False 
     */
    UpdateLabelName( $wxId, $toWxId, $labelIDList = '')
     {
        var api = 'Label/UpdateLabelName';
        $data = compact('toWxId', 'labelIDList', 'wxId');
        if ($labelIDList == '') unset($data['labelIDList']);
        return this.request( api, data );
    }
        
    
    /**
     * DeleteLabelName 删除标签 
     * @param string wxId 微信Id  必填True 
     * @param string labelIDList 标签名称  必填True 
     */
    DeleteLabelName( $wxId, $labelIDList)
     {
        var api = 'Label/DeleteLabelName';
        $data = compact('labelIDList', 'wxId');
        return this.request( api, data );
	}
	
	get( api, ret ){

		var self = this;

		return new Promise(function(resolve, reject) {

			Request.get( self.host + api, ret, data => {

				var res = self.paser( data );

				if ( res.Code == 0 ){
					resolve( res.Data );
				} else {
					reject( res.Message );
				}

			} );
			
		});


	}
	
	post( api, ret ){

		var self = this;
		var url  = self.host + api;		

		return new Promise(function(resolve, reject) {

			//console.log( ret );

			Request.post( url, ret, ( code, data ) => {

				//var res = self.paser( data );

				if ( code == 200 && data.Code == 0 ){
					resolve( data.Data );
				} else {
					reject( data.Message || data.message );
				}

			} );
			
		});
	}

	paser( data ){

		return data;
		
		var status = 0;
		var result = null;

		console.log( data );

		if( data.Code ){

			if( data.Code != 0 ){
                status = -data['Code'];
                result = data['Message'];
			}else{
				result = data['Data'] ? data['Data'] : data['Message'];
			}

		}

		return { 'status' : status, 'result' : result };
        
        //cb && cb( { 'status' : status, 'result' : result } );
	}
    
    /**
     * GetLoginQrCode 获取登陆二维码 
     * @param string proxyIp 代理Ip  必填False 
     * @param string proxyUserName 代理用户名  必填False 
     * @param string proxyPassword 代理密码  必填False 
     * @param string deviceID 设备ID  必填False 
     * @param string deviceName 设备名称  必填False 
     */
    GetLoginQrCode( proxyIp = '', proxyUserName = '', proxyPassword = '', deviceID = '', deviceName = '')
     {
        var api = 'Login/GetQrCode';
		var ret = { proxyIp, proxyUserName, proxyPassword, deviceID, deviceName };

        return this.post( api, ret );
    }
        
    
    /**
     * CheckLogin 检查是否登陆 
     * @param string uuid UUid  必填True 
     */
    CheckLogin( uuid )
     {
        var api = 'Login/CheckLogin/' + uuid;
        return this.post( api );
    }
        
    
    /**
     * Data62Login 62登陆 
     * @param string userName 用户名  必填True 
     * @param string password 密码  必填True 
     * @param string data62 data62数据  必填True 
     * @param string proxyIp 代理Ip  必填False 
     * @param string proxyUserName 代理用户名  必填False 
     * @param string proxyPassword 代理密码  必填False 
     * @param string deviceName 设备名称  必填False 
     */
    Data62Login( $userName, $password, $data62, $proxyIp = '', $proxyUserName = '', $proxyPassword = '', $deviceName = '')
     {
        var api = 'Login/Data62Login';
        $data = compact('userName', 'password', 'data62', 'proxyIp', 'proxyUserName', 'proxyPassword', 'deviceName');
        return this.request( api, data );
    }
        
    
    /**
     * A16Login A16登陆 
     * @param string userName 登录账号  必填True 
     * @param string password 登录密码  必填True 
     * @param string a16Data A16数据  必填False 
     * @param string wxid Wxid,用于获取缓存  必填False 
     */
    A16Login( $userName, $password, $a16Data = '', $wxid = '')
     {
        var api = 'Login/A16Login';
        $data = compact('userName', 'password', 'a16Data', 'wxid');
        return this.request( api, data );
    }
        
    
    /**
     * HeartBeat 心跳 
     * @param string wxId 微信Id  必填True 
     */
    HeartBeat( $wxId)
     {
        var api = 'Login/HeartBeat/' + $wxId;
        return this.request( api );
    }
        
    
    /**
     * LogOut 退出登录 
     * @param string wxId 微信Id  必填True 
     */
    LogOut( $wxId)
     {
        var api = 'Login/LogOut/'+ $wxId;
        return this.request( api );
    }
        
    
    /**
     * InitUser 初始化好友信息 
     * @param string wxId 微信Id  必填True 
     * @param integer syncKey 同步key  必填False 
     * @param string buffer buffer  必填False 
     */
    InitUser( $wxId,  $syncKey = 0, $buffer = '')
     {
        var api = 'Login/InitUser';
        $data = compact('syncKey', 'buffer', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * NewInit 初始化用户信息 
     * @param string wxId 微信Id  必填True 
     */
    NewInit( $wxId)
     {
        var api = 'Login/NewInit/'+ $wxId;
        return this.request( api );
    }
        
    
    /**
     * GetMFriend 获取新的朋友的列表 
     * @param string wxId 微信id  必填True 
     * @param integer type 微信id  必填True 
     */
    GetMFriend( $wxId,  $type)
     {
        var api = 'Login/GetMFriend/'+ $wxId +'/' + $type;
        return this.request( api );
    }
        
    
    /**
     * Get62Data 获取62数据 
     * @param string wxId   必填True 
     */
    Get62Data( $wxId)
     {
        var api = 'Login/Get62Data/'+ $wxId;
        return this.request( api );
    }
        
    
    /**
     * GetLoginUrl 获取登陆Url 
     * @param string wxId 微信Id  必填True 
     * @param string uuid UUid  必填True 
     */
    GetLoginUrl( $wxId, $uuid)
     {
        var api = 'Login/GetLoginUrl';
        $data = compact('uuid', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * ExtDeviceLoginConfirmGet PC设备登陆扫码 
     * @param string wxId 微信Id  必填True 
     * @param string loginUrl 登陆URl  必填True 
     */
    ExtDeviceLoginConfirmGet( $wxId, $loginUrl)
     {
        var api = 'Login/ExtDeviceLoginConfirmGet';
        $data = compact('loginUrl', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * ExtDeviceLoginConfirmOK PC设备登陆确认 
     * @param string wxId 微信Id  必填True 
     * @param string loginUrl 登陆URl  必填True 
     */
    ExtDeviceLoginConfirmOK( $wxId, $loginUrl)
     {
        var api = 'Login/ExtDeviceLoginConfirmOK';
        $data = compact('loginUrl', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * PhoneDeviceLogin 辅助登录新手机设备 
     * @param string wxId 微信Id  必填True 
     * @param string url 登陆二维码的url  必填True 
     */
    PhoneDeviceLogin( $wxId, $url)
     {
        var api = 'Login/PhoneDeviceLogin';
        $data = compact('url', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * OtherDeviceLogin 辅助登录其他应用(https://open.weixin.qq.com/) 
     * @param string wxId 微信Id  必填True 
     * @param string url 登陆二维码的url  必填True 
     */
    OtherDeviceLogin( $wxId, $url)
     {
        var api = 'Login/OtherDeviceLogin';
        $data = compact('url', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * Sync 同步微信消息 
     * @param string wxId 微信Id  必填True 
     */
    Sync( $wxId) {
        var api = 'Message/Sync/' + $wxId;
        return this.request( api );
    }
        
    
    /**
     * SendTxtMessage 发送文本信息  
     * @param string wxId 微信Id  必填True 
     * @param array toWxIds 发送的微信ID  必填True 
     * @param string content 发送内容  必填True
     */
    SendTxtMessage( $wxId, $toWxIds, $content)
     {
        var api = 'Message/SendTxtMessage';
        $data = compact('toWxIds', 'content', 'wxId');
        return this.request( api, data );
    }


    /**
     * SendVoiceMessage 发送声音消息 
     * @param string wxId 微信Id  必填True 
     * @param array toWxIds 发送的微信ID  必填True 
     * @param integer voiceSecond 声音秒数(1000 = 1秒)  必填True 
     * @param string base64 Base4声音  必填True 
     * @param string fileName 文件类型  必填True 
     */
    SendVoiceMessage(  $wxId, $toWxIds,  $voiceSecond, $base64, $fileName)
     {
        var api = 'Message/SendVoiceMessage';
        $data = compact('toWxIds', 'voiceSecond', 'base64', 'fileName', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * SendImageMessage 发送图片消息 
     * @param string wxId 微信Id  必填True 
     * @param array toWxIds 接收的微信ID  必填True 
     * @param string base64 图片  必填True 
     */
    SendImageMessage( $wxId, $toWxIds, $base64)
     {
        var api = 'Message/SendImageMessage';
        $data = compact('toWxIds', 'base64', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * SendVideoMessage 发送视频消息 
     * @param string wxId 微信Id  必填True 
     * @param array toWxIds 发送的微信ID  必填True 
     * @param integer playLength 播放时长 秒  必填True 
     * @param string base64 视频base64  必填True 
     * @param string imageBase64 封面base64  必填True 
     */
    SendVideoMessage( $wxId, $toWxIds,  $playLength, $base64, $imageBase64)
     {
        var api = 'Message/SendVideoMessage';
        $data = compact('toWxIds', 'playLength', 'base64', 'imageBase64', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * SendAppMessage 发送App消息 
     * @param string wxId 微信Id  必填True 
     * @param array toWxIds 接收的微信ID  必填True 
     * @param string appId appId  必填True 
     * @param string title 标题  必填True 
     * @param string desc 描述  必填True 
     * @param integer type app类型 3：音乐  4：小app  5：大app  必填True 
     * @param string url 链接  必填True 
     * @param string thumbUrl 图片地址  必填True 
     * @param integer showType showType  必填False 
     * @param string dataUrl 数据Url  必填False 
     */
    SendAppMessage( $wxId, $toWxIds, $appId, $title, $desc,  $type, $url, $thumbUrl,  $showType = 0, $dataUrl = '')
     {
        var api = 'Message/SendAppMessage';
        $data = compact('toWxIds', 'appId', 'title', 'desc', 'type', 'showType', 'url', 'dataUrl', 'thumbUrl', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * SendShareMessage 发送分享消息 
     * @param string wxId 微信Id  必填True 
     * @param array toWxIds 接收的微信ID  必填True 
     * @param string title 标题  必填True 
     * @param string desc 描述  必填True 
     * @param integer type app类型 3：音乐  4：小app  5：大app  必填True 
     * @param string url 链接  必填True 
     * @param string thumbUrl 图片地址  必填True 
     * @param integer showType showType  必填False 
     * @param string dataUrl 数据Url  必填False 
     */
    SendShareMessage( $wxId, $toWxIds, $title, $desc,  $type, $url, $thumbUrl,  $showType = 0, $dataUrl = '')
     {
        var api = 'Message/SendShareMessage';
        $data = compact('toWxIds', 'title', 'desc', 'type', 'showType', 'url', 'dataUrl', 'thumbUrl', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * SendCardMessage 发送卡片消息 
     * @param string wxId 微信Id  必填True 
     * @param array toWxIds 接收的微信ID  必填True 
     * @param string cardWxId 发送的微信Id  必填True 
     * @param string cardNickName 昵称  必填True 
     * @param string cardAlias 别名  必填False 
     */
    SendCardMessage( $wxId, $toWxIds, $cardWxId, $cardNickName, $cardAlias = '')
     {
        var api = 'Message/SendCardMessage';
        $data = compact('toWxIds', 'cardWxId', 'cardNickName', 'cardAlias', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * SendLocationMessage 发送位置信息 
     * @param string wxId 微信Id  必填True 
     * @param array toWxIds 接收的微信ID  必填True 
     * @param string longitude 经度  必填True 
     * @param string latitude 纬度  必填True 
     * @param string name 名称  必填True 
     */
    SendLocationMessage( $wxId, $toWxIds, $longitude, $latitude, $name)
     {
        var api = 'Message/SendLocationMessage';
        $data = compact('toWxIds', 'longitude', 'latitude', 'name', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * SendMediaMessage 发送文件消息 
     * @param string wxId 微信Id  必填True 
     * @param array toWxIds 接收的微信ID  必填True 
     * @param string attachId 附件Id  必填True 
     * @param string title 标题  必填True 
     * @param integer length 文件大小  必填True 
     * @param string fileExt 文件后缀名  必填True 
     */
    SendMediaMessage( $wxId, $toWxIds, $attachId, $title,  $length, $fileExt)
     {
        var api = 'Message/SendMediaMessage';
        $data = compact('toWxIds', 'attachId', 'title', 'length', 'fileExt', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * SendXmlMessage 发送xml消息 
     * @param string wxId 微信Id  必填True 
     * @param array toWxIds 接收的微信ID  必填True 
     * @param string xml xml内容(appmsg的内容)  必填True 
     */
    SendXmlMessage( $wxId, $toWxIds, $xml)
     {
        var api = 'Message/SendXmlMessage';
        $data = compact('toWxIds', 'xml', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * GetBigImage 获取大图片 
     * @param string wxId 微信Id  必填True 
     * @param string toWxId 接收的微信Id  必填True 
     * @param integer msgId 消息Id  必填True 
     * @param integer longDataLength 消息长度  必填True 
     * @param integer compressType 0：压缩 1：高清 默认为0  必填False 
     */
    GetBigImage( $wxId, $toWxId,  $msgId,  $compressType,  $longDataLength = 0)
     {
        var api = 'Message/GetBigImage';
        $data = compact('toWxId', 'msgId', 'compressType', 'longDataLength', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * GetBigVideo 获取视频 
     * @param string wxId 微信Id  必填True 
     * @param string toWxId 接收的微信Id  必填True 
     * @param integer msgId 消息Id  必填True 
     * @param integer longDataLength 消息长度，xml中length  必填True 
     * @param string location 服务器视频存储路径(D:\\\test.mp4)  必填True 
     * @param integer compressType 0：压缩 1：高清 默认为0  必填False 
     */
    GetBigVideo( $wxId, $toWxId,  $msgId,  $longDataLength, $location,  $compressType = 0)
     {
        var api = 'Message/GetBigVideo';
        $data = compact('toWxId', 'msgId', 'longDataLength', 'location', 'compressType', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * UploadFile 上传文件 
     * @param string wxId 微信Id  必填True 
     * @param integer fileType 文件类型 4:txt 6:pdf  必填True 
     * @param string base64 base64文件  必填True 
     */
    UploadFile( $wxId,  $fileType, $base64)
     {
        var api = 'Message/UploadFile';
        $data = compact('fileType', 'base64', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * Emoji 转发动态表情 
     * @param string wxId 微信Id  必填True 
     * @param array toWxIds 发送的微信ID  必填True 
     * @param integer len 动图时长  必填True 
     * @param string mD5 动图MD5  必填True 
     */
    Emoji( $wxId, $toWxIds,  $len, $mD5)
     {
        var api = 'MessageForward/Emoji';
        $data = compact('toWxIds', 'len', 'mD5', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * Video 视频转发 
     * @param string wxId 微信Id  必填True 
     * @param array toWxIds 接收的微信ID  必填True 
     * @param string xml 源消息XML  必填True 
     */
    Video( $wxId, $toWxIds, $xml)
     {
        var api = 'MessageForward/Video';
        $data = compact('toWxIds', 'xml', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * Img 图片转发 
     * @param string wxId 微信Id  必填True 
     * @param array toWxIds 接收的微信ID  必填True 
     * @param string aesKey AesKey  必填True 
     * @param integer cDNMidImgSize xml中的length  必填False 
     * @param string cDNMidImgUrl xml中的cdnmidimgurl  必填False 
     * @param integer cDNThumbImgSize xml中的cdnthumblength  必填False 
     * @param string cDNThumbImgUrl xml中的cdnthumburl  必填False 
     * @param string cDNBigImgUrl xml中的cdnbigimgurl  必填False 
     * @param integer cDNBigImgSize xml中的hdlength  必填False 
     */
    Img( $wxId, $toWxIds, $aesKey,  $cDNMidImgSize = 0, $cDNMidImgUrl = '',  $cDNThumbImgSize = 0, $cDNThumbImgUrl = '', $cDNBigImgUrl = '',  $cDNBigImgSize = 0)
     {
        var api = 'MessageForward/Img';
        $data = compact('toWxIds', 'aesKey', 'cDNMidImgSize', 'cDNMidImgUrl', 'cDNThumbImgSize', 'cDNThumbImgUrl', 'cDNBigImgUrl', 'cDNBigImgSize', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * Share 分享转发 
     * @param string wxId 微信Id  必填True 
     * @param array toWxIds 接收的微信ID  必填True 
     * @param integer type 分享类型  必填True 
     * @param string xml 源消息XML  必填True 
     */
    Share( $wxId, $toWxIds,  $type, $xml)
     {
        var api = 'MessageForward/Share';
        $data = compact('toWxIds', 'type', 'xml', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * GetBandCardList 获取余额以及银行卡信息 
     * @param string wxId 微信Id  必填True 
     */
    GetBandCardList( $wxId)
     {
        var api = 'Pay/GetBandCardList/' + $wxId;
        return this.request( api );
    }
        
    
    /**
     * CreatePreTransfer 创建转账 
     * @param string wxId 微信Id  必填True 
     * @param string toWxId 到账微信Id  必填True 
     * @param number money 金额  必填True 
     * @param string name 转账名称  必填False 
     */
    CreatePreTransfer( $wxId, $toWxId, $money, $name = '')
     {
        var api = 'Pay/CreatePreTransfer';
        $data = compact('toWxId', 'money', 'name', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * ConfirmTransfer 确认转账 
     * @param string wxId 微信Id  必填True 
     * @param string bankType 银行类型  必填True 
     * @param string bindSerial 绑定卡号的Id  必填True 
     * @param string reqKey 请求的Key  必填True 
     * @param string payPassword 支付密码  必填True 
     */
    ConfirmTransfer( $wxId, $bankType, $bindSerial, $reqKey, $payPassword)
     {
        var api = 'Pay/ConfirmTransfer';
        $data = compact('bankType', 'bindSerial', 'reqKey', 'payPassword', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * Collectmoney 确认收款 
     * @param string wxId 微信Id  必填True 
     * @param string invalidTime InvalidTime  必填True 
     * @param string transId TransId  必填True 
     * @param string transactionId TransactionId  必填True 
     * @param string toWxid 转账人wxid  必填True 
     */
    Collectmoney( $wxId, $invalidTime, $transId, $transactionId, $toWxid)
     {
        var api = 'Pay/Collectmoney';
        $data = compact('invalidTime', 'transId', 'transactionId', 'toWxid', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * Getaedenvelope 收红包 
     * @param string wxId 微信Id  必填True 
     * @param string nativeUrl 红包消息中取该参数;  必填True 
     */
    Getaedenvelope( $wxId, $nativeUrl)
     {
        var api = 'Pay/Getaedenvelope';
        $data = compact('nativeUrl', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * GenerateCustomPayQCode 生成自定义支付二维码 
     * @param string wxId 微信Id  必填True 
     * @param number money 金额  必填True 
     * @param string name 描述  必填False 
     */
    GenerateCustomPayQCode( $wxId, $money, $name)
     {
        var api = 'Pay/GeneratePayQCode';
        $data = compact('name', 'money', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * GeneratePayQCode 生成支付二维码 
     * @param string wxId wxId  必填True 
     */
    GeneratePayQCode( $wxId)
     {
        var api = 'Pay/GeneratePayQCode/' + $wxId;
        return this.request( api, null, 'get');
    }
        
    
    /**
     * info 获取个人信息 
     * @param string wxId 微信Id  必填True 
     */
    UserInfo( $wxId) {
        var api = 'user/info';
        $data = compact('wxId');
        return this.request( api, data );
    }
        
    
    /**
     * UploadHeadImage 修改头像 
     * @param string wxId 微信Id  必填True 
     * @param string base64 图片  必填True 
     */
    UploadHeadImage( $wxId, $base64)
    {
        var api = 'user/UploadHeadImage';
        $data = compact('base64', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * GetMyQrCode 获取自己二维码
     * @param string wxId   必填True 
     * @param string toWxId   必填True 
     */
    GetMyQrCode( $wxId, $toWxId)
    {
        var api = 'user/GetMyQrCode/'+ $wxId +'/' + $toWxId;
        return this.request( api );
    }
        
    
    /**
     * UpdateProfile 修改资料 
     * @param string wxId 微信Id  必填True 
     * @param string nickName 昵称  必填False 
     * @param integer sex 性别 0:无 1:男 2：女  必填False 
     * @param string country 国家拼音 例如：CH  必填False 
     * @param string province 省份拼音 例如：HuBei  必填False 
     * @param string city 城市拼音 例如:WuHan  必填False 
     * @param string signature 签名  必填False 
     */
    UpdateProfile( $wxId, $nickName = '',  $sex = 0, $country = '', $province = '', $city = '', $signature = '')
    {
        var api = 'user/UpdateProfile';
		$data = compact('nickName', 'sex', 'country', 'province', 'city', 'signature', 'wxId');
		
		$data.forEach( ( val, ele ) => {
			if (val == '' || (key == 'sex' && val == 0)) {
				delete $data[key];
            }
		} );
		
        return this.request( api, data );
    }
        
    
    /**
     * NewVerifyPasswd 验证密码 
     * @param string wxId 微信Id  必填True 
     * @param string password 验证密码  必填True 
     */
    NewVerifyPasswd( $wxId, $password)
    {
        var api = 'user/NewVerifyPasswd';
        $data = compact('password', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * ChangePassword 修改密码 
     * @param string wxId 微信Id  必填True 
     * @param string newPassword 新密码  必填False 
     * @param string ticket 票据  必填False 
     */
    ChangePassword( $wxId, $newPassword = '', $ticket = '')
    {
        var api = 'user/ChangePassword';
        $data['wxId'] = $wxId;
        if($newPassword != '') {
            $data['newPassword'] = $newPassword;
        }
        if($ticket != '') {
            $data['ticket'] = $ticket;
        }
        return this.request( api, data );
    }
        
    
    /**
     * OneChangePassword 一键修改密码 
     * @param string wxId 微信Id  必填True 
     * @param string password 旧密码  必填False 
     * @param string newPassword 新密码  必填False 
     */
    OneChangePassword( $wxId, $password = '', $newPassword = '')
    {
        var api = 'user/OneChangePassword';
        $data['wxId'] = $wxId;
        if($password != '') {
            $data['password'] = $password;
        }
        if($newPassword != '') {
            $data['newPassword'] = $newPassword;
        }
        return this.request( api, data );
    }
        
    
    /**
     * SetAlisa 设置微信号 
     * @param string wxId 微信Id  必填True 
     * @param string alisa 微信号;  必填True 
     */
    SetAlisa( $wxId, $alisa)
    {
        var api = 'user/SetAlisa';
        $data = compact('alisa', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * BindEmail 绑定邮箱 
     * @param string wxId 微信Id  必填True 
     * @param string email 邮箱  必填True 
     */
    BindEmail( $wxId, $email)
    {
        var api = 'user/BindEmail';
        $data = compact('email', 'wxId');
        return this.request( api, data );
    }
        
    
    /**
     * GetVerifycode 获取短信验证码 
     * @param string wxId 微信Id  必填True 
     * @param string phone 手机号  必填True 
     * @param string code 验证码  必填False 
     */
    GetVerifycode( $wxId, $phone, $code = '')
    {
        var api = 'user/GetVerifycode';
        $data = compact('phone', 'code', 'wxId');
        if($code == '') unset($data['code']);
        return this.request( api, data );
    }
        
    
    /**
     * BindMobile 绑定手机号 
     * @param string wxId 微信Id  必填True 
     * @param string phone 手机号  必填True 
     * @param string code 验证码  必填False 
     */
    BindMobile( $wxId, $phone, $code = '')
    {
        var api = 'user/BindMobile';
        $data = compact('phone', 'code', 'wxId');
        if($code == '') unset($data['code']);
        return this.request( api, data );
    }
        
    
    /**
     * UnBindMobile 解绑手机号 
     * @param string wxId 微信Id  必填True 
     * @param string phone 手机号  必填True 
     * @param string code 验证码  必填False 
     */
    UnBindMobile( $wxId, $phone, $code = '')
    {
        var api = 'user/UnBindMobile';
        $data = compact('phone', 'code', 'wxId');
        if($code == '') unset($data['code']);
        return this.request( api, data );
    }
        
    
    /**
     * VerifyIdCard 验证身份证 
     * @param string wxId 微信Id  必填True 
     * @param string realName 真实姓名  必填True 
     * @param integer idCardType 身份证类型  必填True 
     * @param string idCardNumber 身份证号码  必填True 
     */
    VerifyIdCard( $wxId, $realName,  $idCardType, $idCardNumber)
    {
        var api = 'user/VerifyIdCard';
        $type = 'post';
        $data = compact('realName', 'idCardType', 'idCardNumber', 'wxId');
        return this.request( api, data );
    }
    
}

module.exports = Weixin;