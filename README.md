# 授权封装：
## 前端开发时，确认以下几点内容：
- 前端在使用前，应该确定服务端已经配置好公众号，并写好授权模块接口。
- 授权接口能调通，正常返回appId、timestamp、nonceStr、signature。
- 页面需要用微信打开或是微信开发都工具打开
- 页面需要跑在公众号配置的安全域名下方能使用API。

注：每次URL变化时，需要重新调用授权接口。（同一个url仅需调用一次，对于变化url的SPA的web app可在每次url变化时进行调用,目前Android微信客户端不支持pushState的H5新特性，所以使用pushState来实现web app的页面会导致签名失败，此问题会在Android6.2中修复）

<h1>
import request from "@/utils/request";
import wx from "weixin-js-sdk";

//此接口这服务端接口，返回API所需的授权参数
function getJsapiTicket(params) {
    return request({
        url: `/api/wxconfig`,
        method: "get",
        params
    });
}

export function readyWxFun(jsApiList, fun) {
    return new Promise((resolve, reject) => {
        var wxurl;
         wxurl = window.location.href.split('#')[0];
        // 调用后端授权接口去授权，需要配置好公众号
        getJsapiTicket({
            // activityId: "4",
            url: wxurl
        })
            .then((res) => {
                console.log(res);
                if (res.code === "8000") {
                    wx.config({
                        debug: true, // 开启调试模式,调用的所有api的返回值会在客户端alert出来，若要查看传入的参数，可以在pc端打开，参数信息会通过log打出，仅在pc端时才会打印。
                        appId: res.data.appId, // 必填，公众号的唯一标识
                        timestamp: res.data.timestamp, // 必填，生成签名的时间戳
                        nonceStr: res.data.nonceStr, // 必填，生成签名的随机串
                        signature: res.data.signature, // 必填，签名
                        jsApiList // 必填，需要使用的JS接口列表
                    });
                    wx.ready(() => {
                        if (fun && typeof fun == "function") {
                            fun();
                        }
                        resolve([false]);
                    });
                    wx.error((err) => {
                        console.log("error?getJsapiTicket报错了", err);
                        // alert(err)
                        reject([true, err]);
                    });
                }
            })
            .catch(err => {
                reject([true, err]);
            })
            .finally(() => { });
    });
}
</h1>

API使用示例以分享为例，授权后，其它的使用同分享一样，看官方API调用即可。

<h1>
import wx from "weixin-js-sdk";
import { readyWxFun ,getUserInfo} from "@utils/weixin";

export default {
 mounted() {
      this.share()
  },
  methods: {
    share() {
      // 分享处理
      let shareParams = {
        title: "分享标题", // 分享标题
        desc: "分享描述", // 分享描述
        link: location.href, // 分享链接
        imgUrl: "http://szst.suzhou.gov.cn/portal/szkx/mobile/favicon.png", // 分享图标
        type: "link", // 分享类型,music、video或link，不填默认为link
        // dataUrl: "", // 如果type是music或video，则要提供数据链接，默认为空
      };
      readyWxFun(
        [
          "updateAppMessageShareData",
          "updateTimelineShareData",
          "hideMenuItems",
        ],
        () => {
          // 隐藏功能按钮接口
          wx.hideMenuItems({
            menuList: [
              "menuItem:share:qq",
              "menuItem:share:weiboApp",
              "menuItem:share:facebook",
              "menuItem:share:QZone",
            ],
          });
          // 分享给朋友
          wx.updateAppMessageShareData({
            ...shareParams,
            success: () => {
              console.log("success");
            },
          });
          // 分享到朋友圈
          wx.updateTimelineShareData({
            ...shareParams,
            success: () => {},
          });
        }
      );
    },
  },
};
</h1>

#  服务端

## 在开发前，请先拿到公众号相关账号，进行配置，具体配置方法在下方“公众号配置”中会讲到。代码示例为node.js。

## 安全域名token验证
开发者在公众号提交“接口配置信息”时，微信服务器将发送GET请求到填写的服务器地址URL上，GET请求携带参数如下表所示：

## 参数描述
signature微信加密签名，signature结合了开发者填写的token参数和请求中的timestamp参数、nonce参数。
timestamp时间戳
nonce随机数
echostr随机字符串

开发者通过检验signature对请求进行校验（下面有校验方式）。若确认此次GET请求来自微信服务器，请原样返回echostr参数内容，则接入生效，成为开发者成功，否则接入失败。

<h1>

var crypto = require("crypto");
// 加密方法
function sha1(str) {
  var md5sum = crypto.createHash("sha1");
  md5sum.update(str);
  str = md5sum.digest("hex");
  return str;
}

// 验证tonken
function validateToken(req) {
  return new Promise((resolve, reject) => {
    let query = req.query;
    let signature = query.signature;
    let echostr = query["echostr"];
    let timestamp = query["timestamp"];
    let nonce = query["nonce"];
    let oriArray = new Array();
    oriArray[0] = nonce;
    oriArray[1] = timestamp;
    oriArray[2] = "admin123";// 这里是在公众号接口配置信息里面填写的Token
    oriArray.sort();
    let original = oriArray.join("");
    let scyptoString = sha1(original);
    if (signature == scyptoString) {
      // 验证通过，返回 echostr
      resolve(echostr);
    } else {
      reject(false);
    }
  });
}
// 导出验证 Tonken 的发放
module.exports = validateToken;


const validateToken = require("./validateToken");
// get请求验证tonken有效性
app.get("/weixin_obtain", (req, res) => {
    validateToken(req).then((t) => {
        res.send(t);
    });
});

<h1>

## 生成签名需要以下步骤：

1. ### 获取access_tokenaccess_token是公众号的全局唯一接口调用凭据，公众号调用各接口时都需使用access_token。开发者需要进行妥善保存。access_token的存储至少要保留512个字符空间。access_token的有效期目前为2个小时，需定时刷新，重复获取将导致上次获取的access_token失效。

#### 接口调用请求说明
https请求方式: GET https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=APPID&secret=APPSECRET

参数说明
参数        是否必须   说明
grant_type 是        获取access_token填写client_credential
appid      是        第三方用户唯一凭证
secret     是        第三方用户唯一凭证密钥，即appsecret

返回说明

正常情况下，微信会返回下述JSON数据包给公众号：
{"access_token":"ACCESS_TOKEN","expires_in":7200} 

2. ### 获取jsapi_ticket

用第一步拿到的access_token 采用http GET方式请求获得jsapi_ticket（有效期7200秒，开发者必须在自己的服务全局缓存jsapi_ticket）：https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=ACCESS_TOKEN&type=jsapi

成功返回如下

<h1>

JSON：{   "errcode":0,   "errmsg":"ok",   "ticket":"bxLdikRXVbTPdHSM05e5u5sUoXNKd8-41ZO3MhKoyN5OfkWITDGgnr2fwJ0m9E8NYzWKVZvdVtaUgWvsdshFKA",   "expires_in":7200 } 
<h1>

获得jsapi_ticket之后，就可以生成JS-SDK权限验证的签名了。

3. ### 生成签名签名

#### 生成规则如下：

参与签名的字段包括noncestr（随机字符串）, 有效的jsapi_ticket, timestamp（时间戳）, url（当前网页的URL，不包含#及其后面部分） 。对所有待签名参数按照字段名的ASCII 码从小到大排序（字典序）后，使用URL键值对的格式（即key1=value1&key2=value2…）拼接成字符串string1。这里需要注意的是所有参数名均为小写字符。对string1作sha1加密，字段名和字段值都采用原始值，不进行URL 转义。如下所示：

<h1>

function getSignature(url) {
    const str = 'jsapi_ticket=' + jsapi_ticket + '&noncestr=' + NONCESTR + '&timestamp=' + timestamp + '&url=' + url;
    const sha1 = crypto.createHash('sha1');
    return sha1.update(str).digest('hex');
}
//最终将，生成的签名signature、appId、timestamp、nonceStr返回到前端即可。步骤1到3，代码如下所示：
const express = require('express');
const app = express();
const crypto = require('crypto');
const request = require('request')
const validateToken = require("./validateToken");
const APPID = 'wx07c5bca657336f71';//公众号的appid
const SECRET = 'f77e2e5e0bf604c23f0787a3f9df2381';//公众号的appsecret
const NONCESTR = 'admin123';//签名用的随机串，可定义

let timestamp = (new Date()).getTime();
let access_token = '';
let jsapi_ticket = '';

//获取access_token
function getToken(callback) {
    const newsUrl = 'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=' + APPID + '&secret=' + SECRET;
    request(newsUrl, function (error, response, body) {
        if (error || response.statusCode != '200') {
            getToken(callback);
            return;
        }

        let obj;
        try {
            obj = JSON.parse(body);
        } catch (e) {
            console.log(e);
        }
        if (!obj || !('access_token' in obj)) {
            console.log('Get access token error!', error, response.statusCode, body);
            getToken(callback);
            return;
        }

        access_token = JSON.parse(body).access_token;
        console.log('Got new access token:', access_token);
        timestamp = (new Date()).getTime();
        getTicket(callback);
    });
}
//获取ticket
function getTicket(callback) {
    const newsUrl = 'https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=' + access_token + '&type=jsapi';
    request(newsUrl, function (error, response, body) {
        if (!error && response.statusCode == '200') {
            if (JSON.parse(body).errcode === 0) {
                jsapi_ticket = JSON.parse(body).ticket;
                console.log('ticket:');
                if (callback) {
                    callback();
                }
            }
        } else {
            response.status(response.statusCode).send(body);
        }
    });
}

//签名加密
function getSignature(url) {
    const str = 'jsapi_ticket=' + jsapi_ticket + '&noncestr=' + NONCESTR + '&timestamp=' + timestamp + '&url=' + url;
    const sha1 = crypto.createHash('sha1');
    return sha1.update(str).digest('hex');
}
//前端调用入口，返回到前端签名信息
app.get('/wxconfig', function (req, res) {
    getToken(function () {
        let signature = getSignature(req.query.url);

        res.send({
            code: '8000',
            data: {
                appId: APPID,
                timestamp: timestamp,
                nonceStr: NONCESTR,
                signature: signature
            }
        });
    });
    // let date = (new Date()).getTime();
    //access_token有效时间为2小时
    // if (date - timestamp >= 7200 * 1000) {
    //     getToken(function () {
    //         let signature = getSignature(req.query.url);

    //         res.send({
    //             code: '8000',
    //             data: {
    //                 appId: APPID,
    //                 timestamp: timestamp,
    //                 nonceStr: NONCESTR,
    //                 signature: signature
    //             }
    //         });
    //     });
    // }
    // else {
    //     //这里的url是调用接口时传来的，必须是动态获取当前页面地址‘#’号之前的部分
    //     let signature = getSignature(req.query.url);
    //     res.send({
    //         code: '8000',
    //         data: {
    //             appId: APPID,
    //             timestamp: timestamp,
    //             nonceStr: NONCESTR,
    //             signature: signature
    //         }
    //     });
    // }
});

<h1>

## 公众号配置

此处以测试号为列，测试号信息中的appID及appsecret为服务端接口中，获取acces_token中使用到的参数。

1. 接口配置信息此处配置的是服务端的URL。配置前需要先将服务端“安全域名token验证”接口写好并发布，否则会配置失败。原因如下：
安全域名token验证

开发者通过检验signature对请求进行校验。若确认此次GET请求来自微信服务器，请原样返回echostr参数内容，则接入生效，成为开发者成功，否则接入失败。
注：仅支持80（http）和443（https）两个端口

2. JS接口安全域名设置JS接口安全域后，通过关注该测试号，开发者即可在该域名下调用微信开放的JS接口。即：访问前端页面所在的域名，只有配置了此域名，才有权限调用JSAPI.

### 附：ngrock及本地调试心得

接口配置中的服务端域名和JS安全域名不能是本地IP,在开发时，需要映射成公网环境才能与微信服务器发生数据交互。

以下介绍一款免费的域名映射工具 ngrock.操作步骤如下：

1. 下载客户端https://ngrok.com/
2. 解压出应用
3. 在应用所在的文件夹，打开命令行:   ./ngrok http localhost:80
4. 执行命令，完成映射将服务端80端口，映射出去。当Session Status 为onLine表示映射成功。 

 映射后的地址即为Forwoading后的地址。./ngrok http localhost:80
 将H5页面端1111端口，映射出去：    ./ngrok http localhost:1111
 分享效果图开发都工具打开上面映射的地址：
 微信打开效果：以分享为例，如果授权失败是不能修改分享标题、描述及图片的。
 以下截图中带图标的分享即表示授权及分享成功。