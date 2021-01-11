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

const userIsLogged = (req,res,next,callback) =>{ 
  if(!req.session.userId) res.redirect('/login')
  else{
    callback(req, res, next)
  }
}

app.get('/', (req, res, next) => {
  userIsLogged(req,res,next,(req, res, next) => {
    res.render("index.html", { notes: rows });
  })
})

app.get('/login', (req, res, next) => {
  res.render("login.html");
})

app.listen(PORT, () => {
  console.log(`> Listening at http:localhost:${PORT}`)
})