require("dotenv").config();
const _ = require("lodash");
const DynamicRecord = require("dynamic-record");
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const CottaError = require("../../utils/CottaError.js");
const Promise = require("bluebird");
Promise.promisifyAll(jwt);

const secret = process.env.JWT_SECRET;
const Config = new DynamicRecord({
	tableSlug: "_configurations"
});

// Catch all for authentication (temporary)
router.use(async function(req, res, next){
	try{
		// Anonymous access to API
		const allowUnauthorised = await Config.findBy({"config_name": "allow_unauthorised"});
		if(typeof req.token == "undefined" && allowUnauthorised.data.config_value === true){
			req.user = {
				username: "Anonymous",
				role: "anonymous"
			};
			next();
			return Promise.reject(new Error("Canceling promise"));
		}

		// Authenticate here and also set the logged in users role accordingly
		// Verify auth token
		const payload = await jwt.verifyAsync(req.token, secret);
		req.user = {
			username: payload.username,
			role: payload.role
		};
		next();
	}catch(err){
		if(err.message !== "Canceling promise"){
			next(new CottaError("Auth Token Invalid", err.message, 403));
		}else{
			next(err);
		}
	}
});

module.exports = router;