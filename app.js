/*
 * @Author: your name
 * @Date: 2019-12-19 10:32:21
 * @LastEditTime : 2019-12-19 11:38:10
 * @LastEditors  : Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \NeteaseCloudMusicApi\app.js
 */
const fs = require('fs') // 读写文件
const path = require('path') // 处理文件路径
const express = require('express') // 服务器框架
const bodyParser = require('body-parser') // 格式化body数据
const request = require('./util/request')
const packageJSON = require('./package.json') // 项目配置文件，用于查询版本号
const exec = require('child_process').exec  // 开启一个子进程 进行shell操作
const cache = require('apicache').middleware // 缓存api

// 版本检查
exec('npm info NeteaseCloudMusicApi version', (err, stdout, stderr) => { // shell操作:请求项目的版本号
  if (!err) {
    let version = stdout.trim()
    if (packageJSON.version < version) { // 如果最低版本低于最新版本，则提示
      console.log(`最新版本: ${version}, 当前版本: ${packageJSON.version}, 请及时更新`)
    }
  }
})

const app = express() // 实例化express

/**
 * @description: CORS & Preflight request 设置CORS跨域
 */
app.use((req, res, next) => {
  if (req.path !== '/' && !req.path.includes('.')) {
    res.set({
      'Access-Control-Allow-Credentials': true, // 凭证 （cookie）
      'Access-Control-Allow-Origin': req.headers.origin || '*',
      'Access-Control-Allow-Headers': 'X-Requested-With,Content-Type',
      'Access-Control-Allow-Methods': 'PUT,POST,GET,DELETE,OPTIONS',
      'Content-Type': 'application/json; charset=utf-8'
    })
  }
  req.method === 'OPTIONS' ? res.status(204).end() : next() // 当req的方法为options时,直接返回
})

/**
 * @description: cookie parser 将req.headers.cookie（字符串）解析到req.cookies(对象)中
 */
app.use((req, res, next) => {
  req.cookies = {}, (req.headers.cookie || '').split(/\s*;\s*/).forEach(pair => {
    let crack = pair.indexOf('=')
    if (crack < 1 || crack == pair.length - 1) return
    req.cookies[decodeURIComponent(pair.slice(0, crack)).trim()] = decodeURIComponent(pair.slice(crack + 1)).trim()
  })
  next()
})


/**
 * @description: 中间件也是一个函数,这个函数有配置参数，然后返回真正的处理函数  bodyParser.json() 返回一个真正的解析函数 
 */
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false })) // 解析x-www-form-urlencoder, 即post的body采用get请求url参数的方式

/**
 * @description: 浏览器缓存,所有的路由都设置--协商缓存 新鲜度 两分钟
 * 如果遇到不需要缓存结果的接口,可在请求url后面加一个时间戳参数使url不同
 * 使用浏览器单独访问接口时不会缓存
 */
app.use(cache('2 minutes', ((req, res) => {
  res.statusCode === 200
})))

/**
 * @description: express开放static区域  开放区域不需要合法源验证
 * __dirname指向被执行js文件的绝对路径
 */
app.use(express.static(path.join(__dirname, 'public')))

// router
const special = { // 一般的router名字为module目录的文件名,但是有些router需要特别的名字，这些名字在此映射
  'daily_signin.js': '/daily_signin',
  'fm_trash.js': '/fm_trash',
  'personal_fm.js': '/personal_fm'
}

/**
 * @description: 添加路由,每个路由对应module目录下的文件，文件再使用crypto进行加密 request进行CORS模拟
 */
fs.readdirSync(path.join(__dirname, 'module')).reverse().forEach(file => { // 同步读取module目录的内容 返回一个目录内容文件名的数组
  if (!file.endsWith('.js')) return // endsWith() 方法用于测试字符串是否以指定的后缀结束 如果不是js文件则return
  let route = (file in special) ? special[file] : '/' + file.replace(/\.js$/i, '').replace(/_/g, '/') // 判断router名字是否需要映射 
  let question = require(path.join(__dirname, 'module', file)) // 调用此文件

  app.use(route, (req, res) => {
    let query = Object.assign({}, req.query, req.body, { cookie: req.cookies }) // 重组参数 
    question(query, request) // 传入参数和request对象
      .then(answer => {
        // 特殊字符(汉字)在url中会进行编码，此时通过decodeURIComponent解码
        console.log('[OK]', decodeURIComponent(req.originalUrl)) //decodeURIComponent() 函数可对 encodeURIComponent() 函数编码的 URI 进行解码。
        res.append('Set-Cookie', answer.cookie)// response设置status,body,cookie
        res.status(answer.status).send(answer.body)
      })
      .catch(answer => {
        console.log('[ERR]', decodeURIComponent(req.originalUrl))
        if (answer.body.code == '301') answer.body.msg = '需要登录'
        res.append('Set-Cookie', answer.cookie)
        res.status(answer.status).send(answer.body)
      })
  })
})

const port = process.env.PORT || 3000
const host = process.env.HOST || ''

app.server = app.listen(port, host, () => {
  console.log(`server running @ http://${host ? host : 'localhost'}:${port}`)
})

module.exports = app
