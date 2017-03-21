const _ = require("lodash");
const express = require("express");
const router = express.Router();
const session = require("express-session");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const path = require("path");
const f = require("util").format;
const MongoStore = require('connect-mongo')(session);
const MongoClient = require('mongodb').MongoClient;

// Custom middleware
var restrict = require("./restrict.js");
var authenticate = require("./auth.js");

let mongoURL = f("mongodb://%s:%s@%s/%s", process.env.mongo_user, process.env.mongo_pass, process.env.mongo_server, process.env.mongo_db_name);

var currentPath = "/admin";
router.use(bodyParser.urlencoded({
    extended: false
}));

router.use(session({
    resave: false, // don't save session if unmodified
    saveUninitialized: false, // don't create session until something stored
    secret: ["shhhh, very secret"], // used to maintain session, revoking one will invalidate all sessions
    store: new MongoStore({ url: mongoURL })
}));

router.use(function(req, res, next){
	var err = req.session.error;
	var msg = req.session.success;
	delete req.session.error;
	delete req.session.success;
	res.locals.message = "";
	if (err) res.locals.message = "<p class=\"msg error\">" + err + "</p>";
	if (msg) res.locals.message = "<p class=\"msg success\">" + msg + "</p>";
	next();
});

// Logout by destroying the session
router.get("/logout", function(req, res){
	req.session.destroy(function(){
		res.redirect(path.join(currentPath + "/"));
	});
});

router.get("/login", function(req, res){
	res.render("login");
});

router.post("/login", function(req, res){
	authenticate(req.body.username, req.body.password, function(err, user){
	    if (user) {
			// Regenerate session when signing in
			// to prevent fixation
			req.session.regenerate(function(){
				// Store the user's primary key
				// in the session store to be retrieved,
				// or in this case the entire user object
				req.session.user = user;
				req.session.success = "Authenticated as " + user.name + " click to <a href=\"/admin/logout\">logout</a>. You may now access <a href=\"/restricted\">/restricted</a>.";
				res.redirect(path.join(currentPath + "/"));
			});
		} else {
			req.session.error = "Authentication failed, please check your username and password. (use \"tj\" and \"foobar\")";
			res.redirect(path.join(currentPath + "/login"));
	    }
	});
});

// Use the "restrict" middleware to handle routes not meant for unauthorised access
// Everything registered after this line must have auth cookies
router.use(restrict, function(req, res, next){
	next();
});

router.get("/", function(req, res) {
    res.render("index", {title: "Express"});
});

let collections = require("./admin/collections.js");
router.use("/collections", collections);

let schema = require("./admin/schema.js");
router.use("/schema", schema);

module.exports = router;