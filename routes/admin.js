var express = require("express");
var router = express.Router();
var session = require("express-session");
var bodyParser = require("body-parser");
var bcrypt = require("bcrypt");
var path = require("path");

var currentPath = "/admin";
router.use(bodyParser.urlencoded({
    extended: false
}));

router.use(session({
    resave: false, // don't save session if unmodified
    saveUninitialized: false, // don't create session until something stored
    secret: "shhhh, very secret" // used to maintain session, revoking one will invalidate all sessions
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

//-----------Fake sign up----------------------------------------------------
var users = {
  tj: { name: "tj" }
};

// when you create a user, generate a salt
// and hash the password ("foobar" is the pass here)

bcrypt.hash("foobar", 10, function (err, hash) {
	if (err) throw err;

	users.tj.hash = hash;
});
//---------------------------------------------------------------------------


function authenticate(name, pass, fn) {
	// If not called by another module
	if (!module.parent) console.log("authenticating %s:%s", name, pass);

	// query the db for the given username
	var user = users[name];
	if (!user) return fn(new Error("cannot find user"));

	// apply the same algorithm to the POSTed password, applying
	// the hash against the pass / salt, if there is a match we
	// found the user
	bcrypt.compare(pass, user.hash, function(err, res) {
		if (err) return fn(err);
	    if(res === true){
	    	return fn(null, user);
	    }else{
		    fn(new Error("invalid password"));
		}
	});
}

function restrict(req, res, next) {
	if (req.session.user) {
		next();
	} else {
		req.session.error = "Access denied!";
		res.redirect(path.join(currentPath + "/login"));
	}
}


router.get("/", function(req, res) {
    res.redirect(path.join(currentPath + "/login"));
});

router.get("/restricted", restrict, function(req, res){
	res.send("Wahoo! restricted area, click to <a href=\"/admin/logout\">logout</a>");
});

router.get("/logout", function(req, res){
	// destroy the user's session to log them out
	// will be re-created next request
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
				res.redirect(path.join(currentPath + "/restricted"));
			});
		} else {
			req.session.error = "Authentication failed, please check your username and password. (use \"tj\" and \"foobar\")";
			res.redirect(path.join(currentPath + "/login"));
	    }
	});
});

module.exports = router;