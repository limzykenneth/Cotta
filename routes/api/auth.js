const _ = require("lodash");
const express = require("express");
const router = express.Router();
const session = require("express-session");
const connect = require("../../utils/database.js");
const restrict = require("../../utils/middlewares/restrict.js");
const auth = require("../../utils/auth.js");
const jwt = require("jsonwebtoken");
const CharError = require("../../utils/charError.js");
const Promise = require("bluebird");
Promise.promisifyAll(jwt);
require("dotenv").config();

const secret = process.env.JWT_SECRET;

// Catch all for authentication (temporary)
router.use(function(req, res, next){
	// Anonymous access to API
	if(typeof req.token == "undefined" && process.env.ALLOW_ANNONYMOUS_TOKENS == "true"){
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
		next(new CharError("Auth Token Invalid", err.message, 403));
	});
});

module.exports = router;