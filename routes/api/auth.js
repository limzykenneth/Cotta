require("dotenv").config();
const _ = require("lodash");
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const CottaError = require("../../utils/CottaError.js");
const Promise = require("bluebird");
Promise.promisifyAll(jwt);

const secret = process.env.JWT_SECRET;

// Catch all for authentication (temporary)
router.use(function(req, res, next){
	// Anonymous access to API
	if(typeof req.token == "undefined" && process.env.ALLOW_UNAUTHORISED == "true"){
		req.user = {
			username: "Anonymous",
			role: "anonymous"
		};
		next();
		return;
	}

	// Authenticate here and also set the logged in users role accordingly
	// Verify auth token
	jwt.verifyAsync(req.token, secret).then(function(payload){
		req.user = {
			username: payload.username,
			role: payload.role
		};
		next();
	}).catch(function(err){
		next(new CottaError("Auth Token Invalid", err.message, 403));
	});
});

module.exports = router;