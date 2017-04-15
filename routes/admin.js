const _ = require("lodash");
const express = require("express");
const router = express.Router();
const session = require("express-session");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const path = require("path");
const f = require("util").format;
const MongoStore = require('connect-mongo')(session);
const connect = require("../utils/database.js");
const restrict = require("../utils/middlewares/restrict.js");
const auth = require("../utils/auth.js");

// Mongodb URL to be used for session storage
const mongoURL = f("mongodb://%s:%s@%s/%s", process.env.mongo_user, process.env.mongo_pass, process.env.mongo_server, process.env.mongo_db_name);

// Default body parser
router.use(bodyParser.urlencoded({
    extended: false
}));

// Iniitalize session storage
router.use(session({
    resave: false, // don't save session if unmodified
    saveUninitialized: false, // don't create session until something stored
    // used to sign session tokens, revoking one will invalidate sessions signed with it
    secret: ["shhhh, very secret"],
    store: new MongoStore({
    	url: mongoURL,
    	collection: "_sessions",
    	ttl: 14 * 24 * 60 * 60
    })
}));

// Manage sesion related message
router.use(function(req, res, next){
	var err = req.session.error;
	var msg = req.session.success;
	delete req.session.error;
	delete req.session.success;
	res.locals.message = "";
	if (err) res.locals.message = err;
	if (msg) res.locals.message = msg;
	next();
});

router.use(function(req, res, next){
	req.charMessaging = req.app.get("messaging");
	next();
});

// Logout by destroying the session
router.get("/logout", function(req, res){
	req.session.destroy(function(){
		res.redirect("/admin/login");
	});
});

// Render login page
router.get("/login", function(req, res){
	res.locals.title = "Login";
	res.render("login");
});

// User login
router.post("/login", function(req, res){
	auth.authenticate(req.body.username, req.body.password, function(err, user){
	    if (user) {
			// Regenerate session when signing in
			// to prevent fixation
			req.session.regenerate(function(){
				// Store the user's primary key
				// in the session store to be retrieved,
				// or in this case the entire user object
				req.session.user = user;
				req.session.success = `Welcome ${req.body.username}!`;
				res.redirect("/admin");
			});
		} else {
			req.session.error = "Authentication failed, please check your username and password.";
			res.redirect("/admin/login");
	    }
	});
});

// Render sign up page
router.get("/signup", function(req, res){
	res.render("signup");
});

// User sign up
router.post("/signup", function(req, res){
	auth.signup(req.body.username, req.body.password, function(err){
		if(err){
			// Reject sign up if username already exist in database
			if(err.name == "MongoError" && err.code == 11000){
				// Enumeration risk, should be changed once email system is setup
				res.json({
					status: "failed",
					message: "Username exist."
				});
			}else{
				throw err;
			}
		}

		res.json({status: "success"});
	});
});

// Use the "restrict" middleware to handle routes not meant for unauthorised access
// Everything registered after this line must have auth cookies
router.use(restrict, function(req, res, next){
	next();
});

// Setting data to be used for all authorised routes
router.use(function(req, res, next){
	res.locals.title = "Char";
	res.locals.currentUsername = req.session.user.username;
	res.locals.currentUserRole = req.session.user.role;

	connect.then(function(db){
		db.collection("_schema").find().toArray(function(err, results){
			if(err) throw err;

			// Fetch schema preemptively to simplify latter parts also to render sidebar
			// Models and users should not be fetched as that might take up way too much RAM
			res.locals.schemas = results;
			next();
		});
	});
});

// Render home page for /admin route
router.get("/", function(req, res) {
    res.render("index");
});

// Router for /admin/collections
let collections = require("./admin/collections.js");
router.use("/collections", collections);

// Router for /admin/schema
let schema = require("./admin/schema.js");
router.use("/schema", schema);

// Router for /admin/users
let users = require("./admin/users.js");
router.use("/users", users);

// Router for /admin/config
let configuration = require("./admin/config.js");
router.use("/config", configuration);

// Router for /admin/account
let account = require("./admin/account.js");
router.use("/account", account);

module.exports = router;