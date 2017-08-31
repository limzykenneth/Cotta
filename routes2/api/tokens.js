const _ = require("lodash");
const express = require("express");
const router = express.Router();
const jwt = require('jsonwebtoken');
const auth = require("../../utils/auth.js");
const connect = require("../../utils/database.js");
const Promise = require("bluebird");
Promise.promisifyAll(jwt);

// Route: {root}/api/tokens/...

const secret = "secret_key_PLEASE_CHANGE";

// Generate token for user
router.post("/generate_new_token", function(req, res, next){
	// First, authenticate username and password pair
	auth.authenticate(req.body.username, req.body.password, function(err){
		if(err) next(err);

		// User sucessfully authenticated
		// Next retrieve user info from database
		connect.then(function(db){
			return db.collection("_users_auth").findOne({"username": req.body.username});
		}).then(function(user){
			// Now sign the token
			return jwt.signAsync({
				username: user.username,
				role: user.role
			}, secret, {
				expiresIn: "7d"
			});
		}).then(function(token){
			res.json(token);
		});
	});
});

// router.post("/generate_anonymous_token", function(req, res, nex){

// });

router.use("/", function(req, res){
	res.json({
		message: "Invalid route"
	});
});

module.exports = router;