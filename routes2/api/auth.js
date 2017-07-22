const _ = require("lodash");
const express = require("express");
const router = express.Router();
const session = require("express-session");
const connect = require("../../utils/database.js");
const restrict = require("../../utils/middlewares/restrict.js");
const auth = require("../../utils/auth.js");

// Catch all for authentication (temporary)
router.use(function(req, res, next){
	// authenticate here and also set the logged in users role accordingly
	var authenticated = true;

	if(authenticated){
		next();
	}else{
		res.json({
			status: "error",
			messgae: "Invalid authentication token"
		});
	}
});

module.exports = router;