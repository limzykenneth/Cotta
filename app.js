require('dotenv').config();
const express = require("express");
const socketIO = require("socket.io");
const path = require("path");
const favicon = require("serve-favicon");
const logger = require("morgan");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const _ = require("lodash");
const exphbs  = require('express-handlebars');

let index = require("./routes/index");
let admin = require("./routes/admin");
let api = require("./routes/api");

// Express
let app = express();

// Socket.io
let io = socketIO();
app.io = io;

// View engine setup

app.engine("handlebars", exphbs({
	defaultLayout: "main",
	helpers:{
		ifEquals: function(a, b, opts){
        	if(a == b){
		        return opts.fn(this);
        	}else{
		        return opts.inverse(this);
		    }
        },
        lenEq: function(json, num, opts){
        	if(Object.keys(json).length == num+1){
        		return opts.fn(this);
        	}else{
        		return opts.inverse(this);
        	}
        },
        ifContains: function(collection, item, opts){
        	if(_.includes(collection, item)){
				return opts.fn(this);
        	}else{
        		return opts.inverse(this);
        	}
        }
	}
}));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "handlebars");

// uncomment after placing your favicon in /static
//app.use(favicon(path.join(__dirname, "static", "favicon.ico")));
app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
// Mount root to /public where front end lives
app.use(express.static(path.join(__dirname, "public")));

// Mount /static where backend static assets lives
app.use("/static", express.static(path.join(__dirname, "static")));
// Mount /uploads where uploaded images goes
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Set site root URL for convenience (should really use this more)
app.use(function(req, res, next){
	res.locals.rootURL = `${req.protocol}://${req.get("host")}/`;
	next();
});

// Mount dynamic routes
app.use("/api", api);
app.use("/admin", admin);

// Why again???
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
	console.log(res.locals.error);

	// render the error page
	res.status(err.status || 500);
	res.render("error");
});

module.exports = app;