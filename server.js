const express = require("express")
const nunjucks = require("nunjucks")
const bodyParser = require("body-parser")
const db = require("./db")
const morgan = require('morgan')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const path = require('path')

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
      callback(req, res, next)
    }
  })
}

routeWhereLoginIsRequired('get','/',(req, res, next) => {
  res.render("index.html")
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
        res.redirect('/')
      }else{
        throw new Error('User not found')
      }
    }catch(err){
      res.render("login.html",{ error:err.message });
    }
  }else{
    try{
      const user = await db.findUserByName(name)
      if(user.length > 0){
        const userIDOfLoginFunction = await db.loginUser(name,accessToken)
        req.session.userID = userIDOfLoginFunction
        req.session.accessToken = accessToken
        res.redirect('/')
      }else{
        throw new Error('User not found')
      }
    }catch(err){
      res.render("login.html",{ error:err.message });
    }
  }
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
      res.render("register.html",{ error:err.message });
    }
  
  }else{
    try{
      await db.addUser(name,accessToken,`https://graph.facebook.com/${userID}/picture`,'')
      const myUser = await db.findUserByName(name)
      req.session.accessToken = accessToken
      req.session.userID = myUser[0].id
    }catch(err){
      res.render("register.html",{ error:err.message });
    }
  }

  res.redirect('/')
})

app.listen(PORT, () => {
  console.log(`> Listening at http:localhost:${PORT}`)
})