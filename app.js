require('dotenv').config();
const express = require("express");
const path = require("path");
const favicon = require("serve-favicon");
const logger = require("morgan");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const _ = require("lodash");
const exphbs  = require('express-handlebars');
const lessMiddleware = require('less-middleware');

let index = require("./routes/index");
let admin = require("./routes/admin");
let api = require("./routes/api");

let app = express();

// view engine setup
app.engine("handlebars", exphbs({defaultLayout: "main"}));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "handlebars");

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, "public", "favicon.ico")));
app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/static", lessMiddleware(path.join(__dirname, "static", "src")));
app.use("/static", express.static(path.join(__dirname, "static")));

app.use("/api", api);
app.use("/admin", admin);

if(process.env.NODE_ENV !== "development"){
  app.use("/*", express.static(path.join(__dirname, "public")));
}else{
  app.use("/", index);
}

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error("Not Found");
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
