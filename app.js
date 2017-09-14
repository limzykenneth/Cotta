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

const errors = require("./errors.js");
const views = require("./views.js");

const index = require("./routes/index");
// let admin = require("./routes/admin");
const api = require("./routes2/api/index.js");

// Express
let app = express();

// Socket.io
let io = socketIO();
app.io = io;

// Backend views
app.use(views);

app.use(logger("dev"));

// Parsers
app.use(function(req, res, next){
	if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
        req.token = req.headers.authorization.split(' ')[1];
    }
    next();
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Mount root to /public where custom front end lives
app.use(express.static(path.join(__dirname, "public")));

// Set site root URL for convenience (should really use this more)
app.use(function(req, res, next){
	res.locals.rootURL = `${req.protocol}://${req.get("host")}/`;
	next();
});

// WARN ----- Assets authentication should be considered
// Mount /uploads where uploaded images goes
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Mount dynamic routes
app.use("/api", api);
// app.use("/admin", admin);

// Why again???
if(process.env.NODE_ENV !== "development"){
	app.use("/*", express.static(path.join(__dirname, "public")));
}else{
	app.use("/", index);
}



////////////
// Errors //
////////////
app.use(errors.notFound);
app.use(errors.general);


module.exports = app;