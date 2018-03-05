const _ = require("lodash");
require("dotenv").config();
const express = require("express");
const ActiveRecord = require("active-record");
const jwt = require("jsonwebtoken");
const Promise = require("bluebird");

const router = express.Router();
const auth = require("../../utils/auth.js");
Promise.promisifyAll(jwt);
const CharError = require("../../utils/charError.js");
const Users = new ActiveRecord("_users_auth");

// Route: {root}/api/tokens/...

const secret = process.env.JWT_SECRET;

// Generate token for user
router.post("/generate_new_token", function(req, res, next){
	// First, authenticate username and password pair
	auth.authenticate(req.body.username, req.body.password, function(err){
		if(err) {
			let error = new CharError();

			if(err.message == "invalid password"){
				error.title = "Authentication Failed";
				error.message = "Username or password provided is incorrect";
				error.status = 401;
			}

			next(error);
			return;
		}

		// User sucessfully authenticated
		// Next retrieve user info from database
		Users.findBy({"username": req.body.username}).then((user) => {
			return jwt.signAsync({
				username: user.data.username,
				role: user.data.role
			}, secret, {
				expiresIn: "7d"
			});
		}).then((token) => {
			res.json({"access_token": token});
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