const _ = require("lodash");
const express = require("express");
const router = express.Router();
const session = require("express-session");
const connect = require("../../utils/database.js");
const restrict = require("../../utils/middlewares/restrict.js");
const auth = require("../../utils/auth.js");
const jwt = require('jsonwebtoken');
const Promise = require("bluebird");
Promise.promisifyAll(jwt);

const secret = "secret_key_PLEASE_CHANGE";

// Catch all for authentication (temporary)
router.use(function(req, res, next){
	// Authenticate here and also set the logged in users role accordingly
	// Verify auth token
	jwt.verifyAsync(req.token, secret).then(function(payload){
		next();
	}).catch(function(err){
		res.status(403);
		res.json({
			status: "error",
			message: err.message
		});
	});
});

module.exports = router;