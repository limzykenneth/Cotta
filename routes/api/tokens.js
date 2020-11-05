require("dotenv").config();
const _ = require("lodash");
const express = require("express");
const DynamicRecord = require("dynamic-record");
const jwt = require("jsonwebtoken");
const Promise = require("bluebird");
const nanoid = require("nanoid");

const router = express.Router();
const CottaError = require("../../utils/CottaError.js");
const auth = require("../../utils/auth.js");
Promise.promisifyAll(jwt);
const Config = new DynamicRecord({
	tableSlug: "_configurations"
});

// Route: {root}/api/tokens/...

const secret = process.env.JWT_SECRET;

// Generate token for user
router.post("/generate_new_token", async function(req, res, next){
	try{
		// First, authenticate username and password pair
		const user = await auth.authenticate(req.body.username, req.body.password);

		// User sucessfully authenticated
		const token = await jwt.signAsync({
			username: user.data.username,
			role: user.data.role
		}, secret, {
			expiresIn: "7d"
		});

		res.json({"access_token": token});
	}catch(err){
		next(err);
	}
});

router.post("/generate_anonymous_token", async function(req, res, next){
	try{
		const allowAnonTokens = await Config.findBy({"config_name": "allow_anonymous_tokens"});

		if(allowAnonTokens.data.config_value === "true"){
			// First, authenticate username and password pair
			const user = await auth.authenticate(req.body.username, req.body.password);
			// User sucessfully authenticated
			const tokenID = nanoid(20);
			if(Array.isArray(user.data.anonymous_tokens)){
				user.data.anonymous_tokens.push(tokenID);
			}else{
				user.data.anonymous_tokens = [tokenID];
			}

			// NOTE: Was meaning to save the token in the database but still need more implementation

			const token = await jwt.signAsync({
				username: "anonymous",
				role: "anonymous",
				tokenID: tokenID
			}, secret);

			res.json({"access_token": token});

		}else{
			throw new CottaError("Not Found", "Cannot find resource", 404);
		}
	}catch(err){
		next(err);
	}
});

module.exports = router;