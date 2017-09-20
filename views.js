const express = require("express");
const path = require("path");
const favicon = require("serve-favicon");
const exphbs  = require('express-handlebars');

// Express
let app = express();

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

// Mount /static where backend static assets lives
app.use("/static", express.static(path.join(__dirname, "static")));

module.exports = app;