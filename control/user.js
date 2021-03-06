const User = require("../models/user")
const Article = require("../models/article")
const Comment = require("../models/comment")

const encrypto = require("../util/encrypto")





// 注册
exports.reg = async (ctx) => {
  // console.log("这是处理用户注册的中间件");
  const user = ctx.request.body;
  const username = user.username;
  const password = user.password;

  await new Promise((resolve, reject)=>{
    // 去 User表 里查询
    User.find({username}, (err,res)=>{
      if(err) return reject(err)
      if(res.length !== 0){
        // 查询到数据，则用户名已存在
        resolve("")
      }else{
        // 用户名不存在   需要存到数据库
        const _user = new User({
          username,
          password: encrypto(password),
          articleNum: 0,
          commentNum: 0
        })

        _user.save((err,res)=>{
          if(err)  return reject(err)
          resolve(res)
        })
      }
    })
  })
  .then(async (data)=>{
    if(data){
      // 注册成功
      await ctx.render("isOK", {status:"注册成功"})
    }else{
      // 用户名已存在
      await ctx.render("isOK", {status:"用户名已存在"})
    }
  })
  .catch(async (err)=>{
    // 注册失败
    await ctx.render("isOK",{status: "注册失败，请重试"})
  })

}

// 登录
exports.login = async (ctx)=>{
  // console.log("这是登录的中间件");
  const user = ctx.request.body;
  const username = user.username;
  const password = user.password;

  // 将登录的数据与数据库的数据进行查询比对
  await new Promise((resolve, reject)=>{
    // 去 users 表里查询用户
    User.find({username},(err,data)=>{
      if(err) return reject(err)
      if(data.length === 0 ) return reject("用户名不存在")
      // console.log(data);

      // 用户名存在 进行密码比对
      if (data[0].password === encrypto(password)){
        return resolve(data)
      }
      // 密码不一样，则返回空字符串
      resolve("")
    })
  })
  .then(async data =>{
    if(!data){
      return ctx.render("isOK", {status: "密码输入错误"})
    }
    // 让用户在他的 cookie 里设置 username paassword 加密后的密码 权限
    // 设置 username 的 cookie
    ctx.cookies.set("username", username, {
      domain: "localhost",
      path: "/",
      maxAge: 36e5,
      httpOnly: false,
      overwrite: false
    })

    // 设置 uid 的 cookie
    ctx.cookies.set("uid", data[0]._id, {
      domain: "localhost",
      path: "/",
      maxAge: 36e5,
      httpOnly: false,
      overwrite: false,
    })

    // session记录用户的数据
    ctx.session = {
      username,
      uid: data[0]._id,
      avatar: data[0].avatar,
      role: data[0].role
    }

    await ctx.render("isOK", {status: "登录成功"})
  })
  .catch(async err =>{
    await ctx.render("isOK", {status: "登录失败，请重试"})
  })
}

// 保持登录状态
exports.kepLogin = async (ctx,next)=>{
  // console.log("确定状态的中间件");
  if(ctx.session.isNew){ //session 没有
    if(ctx.cookies.get("username")){
      ctx.session = {
        username : ctx.cookies.get("username"),
        uid : ctx.cookies.get("uid")
      }
    }
  }
  await next()
}

// 登出
exports.logout = async (ctx) =>{
  //清除 session
  ctx.session = null;
  // 清除 cookie
  ctx.cookies.set("username",null, {
    maxAge: 0
  })
  ctx.cookies.set("uid", null, {
    maxAge: 0
  })
  ctx.redirect("/") //
}

// 用户 头像上传
exports.upload = async (ctx) => {
  const filename = ctx.req.file.filename
  let data = {}
  await User.updateOne({_id:ctx.session.uid}, {$set:{avatar: "/avatar/" + filename}},(err,res)=>{
    if(err){
      data = {
        status: 0,
        message: err
      }
    }else{
      data = {
        status: 1,
        message: "上传成功"
      }
    }
  })

  ctx.body = data;
}

// 权限狗 获取用户列表
exports.userlist = async ctx => {

  const uid = ctx.session.uid

  // 用户名 权限 文章数量 评论数量
  const data = await User.find()

  ctx.body = {
    code: 0,
    count: data.length,
    data
  }

}

// 删除用户
exports.del = async ctx =>{

  // 被删除的id
  const uid = ctx.params.id;

  let res = {
    state: 1,
    message: "删除用户成功"
  }

  await User
    .findById(uid)
    .then((data) => {
      data.remove()
    }).catch((err) => {
      res={
        state: 0,
        message: "删除用户失败"
      }
    });


  ctx.body = res

}