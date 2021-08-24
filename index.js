const express = require('express');
const app = express();
const crypto = require('crypto');
const request = require('request')
const validateToken = require("./validateToken");
/* 微信授权登录参数  这个不可以复制 */
const APPID = 'wx07c5bca657336f71';
const SECRET = 'f77e2e5e0bf604c23f0787a3f9df2381';
const NONCESTR = 'ccddsd';//签名用的随机串，可定义

let timestamp = (new Date()).getTime();
let access_token = '';
let jsapi_ticket = '';
// get请求验证tonken有效性
app.get("/", (req, res) => {
    validateToken(req).then((t) => {
        console.log(t)
        res.send(t);
    });
});


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

app.listen(80, () => {
    console.log(`Example app listening at http://localhost:${80}`)
})
