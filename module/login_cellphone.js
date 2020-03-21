/*
 * @Author: your name
 * @Date: 2019-12-19 10:32:22
 * @LastEditTime: 2019-12-19 16:56:13
 * @LastEditors: your name
 * @Description: In User Settings Edit
 * @FilePath: \NeteaseCloudMusicApi\module\login_cellphone.js
 */
// 手机登录

const crypto = require('crypto') // 账号密码进行加密

module.exports = (query, request) => {
  query.cookie.os = 'pc'
  const data = {
    phone: query.phone,
    countrycode: query.countrycode,
    password: crypto.createHash('md5').update(query.password).digest('hex'),
    rememberLogin: 'true'
  }
  return request(
    'POST', `https://music.163.com/weapi/login/cellphone`, data,
    {crypto: 'weapi', ua: 'pc', cookie: query.cookie, proxy: query.proxy}
  )
}
