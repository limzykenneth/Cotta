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

// User the "restrict" middleware to handle routes not meant for unauthorised access
router.use(restrict, function(req, res, next){
	next();
});

router.get("/", function(req, res) {
    res.render("index", {title: "Express"});
});

router.get("/collections", function(req, res){
	res.render("collections");
});

router.post("/schema/new", function(req, res){
	let data = req.body;
	if(!validateIncoming(data.collectionName)){
		res.json({
			status: "failed",
			reason: "Collection names should only contain alphanumeric characters, underscore and spaces."
		});
		return;
	}
	data.collectionSlug = data.collectionName.toLowerCase();

	_.each(data.fields, function(el, i){
		if(!validateIncoming(el.name)){
			res.json({
				status: "failed",
				reason: "Field names should only contain alphanumeric characters, underscore and spaces."
			});
			return false;
		}
		el.slug = el.name.toLowerCase().replace(" ", "_");
	});

	MongoClient.connect(mongoURL, function(err, db){
		if(err) throw err;

		db.collection("_schema").find({collectionSlug: data.collectionSlug}).toArray(function(err, result){
			if(err) throw err;
			if(result.length > 0){
				res.json({
					status: "failed",
					reason: "Collection with that name already exist."
				});
				db.close();
			}else{
				db.collection("_schema").insertOne(data, function(err){
					if(err) throw err;

					res.json({
						status: "success"
					});
					db.close();
				});
			}
		});
	});
});

function validateIncoming(string){
	let regexp = /^[a-zA-Z0-9-_ ]+$/;
	if (string.search(regexp) == -1){
		return false;
	}else{
		return true;
	}
}

module.exports = router;