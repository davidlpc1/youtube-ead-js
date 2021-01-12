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
    if(!req.session.userId) res.redirect('/login')
    else{
      callback(req, res, next)
    }
  })
}

routeWhereLoginIsRequired('get','/',(req, res, next) => 
  res.render("index.html")
)

app.get('/login', (req, res, next) => {
  res.render("login.html");
})

app.post('/login', (req, res, next) => {
  const { username , password ,accessToken ,userID } = req.body
  if(accessToken === null || accessToken === undefined){
    console.log('Do Login with username and password')
    console.log(username,password)
  }else{
    console.log('Do Login with facebook id')
    console.log(accessToken,userID)
  }
  
})

app.listen(PORT, () => {
  console.log(`> Listening at http:localhost:${PORT}`)
})