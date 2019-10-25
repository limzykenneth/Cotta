require("dotenv").config();
const _ = require("lodash");
const express = require("express");
const DynamicRecord = require("dynamic-record");
const jwt = require("jsonwebtoken");
const Promise = require("bluebird");
const nanoid = require("nanoid");

const router = express.Router();
const auth = require("../../utils/auth.js");
Promise.promisifyAll(jwt);
const Users = new DynamicRecord({
	tableSlug: "_users_auth"
});

// Route: {root}/api/tokens/...

const secret = process.env.JWT_SECRET;

// Generate token for user
router.post("/generate_new_token", function(req, res, next){
	// First, authenticate username and password pair
	auth.authenticate(req.body.username, req.body.password).then((user) => {
		// User sucessfully authenticated
		return jwt.signAsync({
			username: user.data.username,
			role: user.data.role
		}, secret, {
			expiresIn: "7d"
		}).then((token) => {
			res.json({"access_token": token});
		});
	}).catch((err) => {
		next(err);
	});
});

router.post("/generate_anonymous_token", function(req, res, next){
	// First, authenticate username and password pair
	auth.authenticate(req.body.username, req.body.password).then((user) => {
		// User sucessfully authenticated
		const tokenID = nanoid(20);
		if(Array.isArray(user.data.anonymous_tokens)){
			user.data.anonymous_tokens.push(tokenID);
		}else{
			user.data.anonymous_tokens = [tokenID];
		}

		// NOTE: Was meaning to save the token in the database but still need more implementation
		// return user.save().then(() => {
		return Promise.resolve(tokenID);
		// });
	}).then((tokenID) => {
		return jwt.signAsync({
			username: "anonymous",
			role: "anonymous",
			tokenID: tokenID
		}, secret);
	}).then((token) => {
		res.json({"access_token": token});
	}).catch((err) => {
		next(err);
	});
});

router.use("/", function(req, res){
	res.json({
		message: "Invalid route"
	});
});

module.exports = router;