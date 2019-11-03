require("dotenv").config();
const _ = require("lodash");
const express = require("express");
const DynamicRecord = require("dynamic-record");

const router = express.Router();
const auth = require("../../utils/auth.js");
const CottaError = require("../../utils/CottaError.js");
const Users = new DynamicRecord({
	tableSlug: "_users_auth"
});
const Config = new DynamicRecord({
	tableSlug: "_configurations"
});

// Only allow signups if app setting allows it
router.use(function(req, res, next){
	Config.findBy({"config_name": "allow_signup"}).then((allowSignup) => {
		if(allowSignup.data.config_value === "true"){
			next();
		}else{
			next(new CottaError("Not Found", "Cannot find resource", 404));
		}
	});
});

router.post("/", function(req, res, next){
	auth.signup(req.body.username, req.body.password, "unverified").then((result) => {
		res.json({
			"message": `User ${result} created`
		});
	}).catch((err) => {
		if(err.name == "MongoError" && err.code == 11000){
			// Duplicate username
			next(new CottaError("Username not available", `Username "${req.body.username}" is already registered`));
		}else{
			next(new CottaError());
		}
	});
});

module.exports = router;