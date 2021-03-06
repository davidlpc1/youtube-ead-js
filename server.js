const express = require("express")
const nunjucks = require("nunjucks")
const bodyParser = require("body-parser")
const db = require("./db")
const morgan = require('morgan')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const path = require('path')
const { getImageUrl,getVideoSrc } = require('./youtube')

const app = express()
const PORT = process.env.PORT || 3000

//Configurando cookies
const sessionOptions = {
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: {}
}

if (app.get('env') === 'production') {
  app.set('trust proxy', 1) 
  sessionOptions.cookie.secure = true 
}

app.use(cookieParser())
app.use(session(sessionOptions))

//Configurar arquivos estáticos na pasta public
app.use(express.static(path.join(__dirname,"public")))
app.use(morgan('dev'))

//Habilitar o req.body para requisições POST
app.use(express.urlencoded({extended: true}))
app.use(bodyParser.json())

// Configuração do Nunjucks
nunjucks.configure("templates", {
  express: app,
  noCache: true, //Retirar na produção
})

const routeWhereLoginIsRequired = (method,routePath,callback) => { 
  app[method](routePath,(req,res,next) => {
    console.log(`Your id is: ${req.session.userID}`)
    if(!req.session.userID) res.redirect('/login')
    else{
      res.setHeader("Content-Type", "text/html")
      callback(req, res, next)
    }
  })
}

routeWhereLoginIsRequired('get','/',async (req, res, next) => {
  const { image } = (await db.findUserById(req.session.userID))[0]
  const categoriesCreatedByUser = await db.findCategoriesByUserId(req.session.userID)
  res.render("index.html",{ loged:true,image,categoriesCreatedByUser })
})

app.get('/login', (req, res, next) => {
  res.render("login.html");
})

app.post('/login', async(req, res, next) => {
  const { username , password ,accessToken ,userID,name } = req.body

  if(accessToken === null || accessToken === undefined){
    try{
      const user = await db.findUserByName(username)
      if(user.length > 0){
        const userIDOfLoginFunction = await db.loginUser(username,password)
        req.session.userID = userIDOfLoginFunction
      }else{
        throw new Error('User not found')
      }
    }catch(err){
      return res.render("login.html",{ error:err.message });
    }
  }else{
    try{
      const user = await db.findUserByName(name)
      if(user.length > 0){
        const userIDOfLoginFunction = await db.loginUser(name,userID)
        req.session.userID = userIDOfLoginFunction
        req.session.accessToken = accessToken
      }else{
        throw new Error('User not found')
      }
    }catch(err){
      return res.render("login.html",{ error:err.message });
    }
  }

  
  return res.redirect('/')
})

app.get('/register', (req, res, next) => {
  res.render("register.html");
})

app.post('/register', async(req, res, next) => {
  const { username , password,passwordAgain ,accessToken , userID ,image,about,name } = req.body

  if(accessToken === null || accessToken === undefined){
    try{
      if(password.trim() !== passwordAgain.trim()){
        throw new Error("Passwords must be equal")
      }

      await db.addUser(username,password,image,about)
      const myUser = await db.findUserByName(username)
      req.session.userID = myUser[0].id
    }catch(err){
      return res.render("register.html",{ error:err.message });
    }
  
  }else{
    try{
      await db.addUser(name,userID,`https://graph.facebook.com/${userID}/picture`,'')
      const myUser = await db.findUserByName(name)
      req.session.accessToken = accessToken
      req.session.userID = myUser[0].id
    }catch(err){
      return res.render("register.html",{ error:err.message });
    }
  }

  return res.redirect('/')
})

routeWhereLoginIsRequired('get','/update_perfil',async (req, res, next) => {
  const { image,about,username ,level } = (await db.findUserById(req.session.userID))[0]
  res.render("update_perfil.html",{ loged:true,image,username,level,about:about.trim() })
})


routeWhereLoginIsRequired('post','/update_perfil',async (req, res, next) => {
  const { username , about ,image } = req.body
  db.updateUser(req.session.userID,username,image,about)
  res.redirect("/update_perfil",{ loged:true,image })
})

routeWhereLoginIsRequired('get','/logout',async (req, res, next) => {
  req.session.userID = null
  res.redirect('/login')
})

routeWhereLoginIsRequired('get','/change_password',async (req, res, next) => {
  const { image } = (await db.findUserById(req.session.userID))[0]
  return res.render('change_password.html',{ loged:true,image })
})

routeWhereLoginIsRequired('post','/change_password',async (req, res, next) => {
  const { old_password,new_password,new_password_again } = req.body;
  const { image } = (await db.findUserById(req.session.userID))[0]
  if(new_password.trim() !== new_password_again.trim()){
    return res.render('change_password.html',{ error:"Passwords must be equal" ,loged:true,image})
  } 
  if(old_password.trim() === new_password.trim()){
    return res.render('change_password.html',{ error:"Your old password cannot be equal to the new",loged:true,image})
  }
  const theOldPasswordIsValid = await db.testPassword(req.session.userID,old_password)
  if(!theOldPasswordIsValid){
    return res.render('change_password.html',{ error:"Your old password is wrong!" ,loged:true,image})
  }

  try{
    await db.changePassword(req.session.userID,old_password,new_password)
    res.redirect('/')
  }catch(err){
    return res.render('change_password.html',{ error:err.message ,loged:true,image})
  }
})

routeWhereLoginIsRequired('get','/create_category',async (req, res, next) => {
  const { image } = (await db.findUserById(req.session.userID))[0]
  return res.render('create_category.html',{ loged:true,image })
})

routeWhereLoginIsRequired('post','/create_category',async (req, res,next) => {
  const { image } = (await db.findUserById(req.session.userID))[0]

  try{
    const { name } = req.body
    const categoryAlreadyExists = await db.findCategoryByName(name)
    if(categoryAlreadyExists.length >= 1) return res.render('create_category.html',{ error:"That category already exists" ,logged:true,image})

    await db.createCategory(req.session.userID,name)
    return res.redirect('/')
  }catch(err){
    return res.render('create_category.html',{ error:err.message ,logged:true,image})
  }

})

routeWhereLoginIsRequired('post','/delete_category/:category_id',async (req, res,next) => {
  const { category_id } = req.params
  const category = (await db.findCategoryById(category_id))[0]
  if(parseInt(category.user_id) === req.session.userID){
    await db.deleteCategoryById(category_id)
  }else{
    req.session.messageOfHomePage = 'You cannot delete this category'
  }

  return res.redirect('/')
})

routeWhereLoginIsRequired('get','/create_video', async (req, res,next) => {
  const { image } = (await db.findUserById(req.session.userID))[0]
  const categories = await db.findAllCategories()
  return res.render('create_video.html',{ loged:true,image,categories })
})

routeWhereLoginIsRequired('post','/create_video', async (req, res,next) => {
  const { image } = (await db.findUserById(req.session.userID))[0]
  const categories = await db.findAllCategories()
  const { name,link,category } = req.body
  try{
    const videoAlreadyExists = await db.findVideoByName(name)
    if(videoAlreadyExists.length >= 1) return res.render('create_video.html',{ loged:true,image,categories,error:'That video already exists' })
    const video_src = getVideoSrc(link)
    const image_src = getImageUrl(link)
    await db.createVideo(name,link,category,req.session.userID,video_src,image_src)
    return res.redirect('/')
  }
  catch(err){
    return res.render('create_video.html',{ loged:true,image,categories,error:err.message })
  }
  
})

app.listen(PORT, () => {
  console.log(`> Listening at http:localhost:${PORT}`)
})