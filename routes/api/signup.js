require("dotenv").config();
const _ = require("lodash");
const express = require("express");
const DynamicRecord = require("dynamic-record");

const router = express.Router();
const auth = require("../../utils/auth.js");
const CottaError = require("../../utils/CottaError.js");
const Config = new DynamicRecord({
	tableSlug: "_configurations"
});

// GET whether the server allows signups
router.get("/", async function(req, res, next){
	try{
		const allowSignup = await Config.findBy({"config_name": "allow_signup"});
		res.json({
			allow_signup: allowSignup.data.config_value
		});
	}catch(err){
		next(err);
	}
});

// Only allow signups if app setting allows it
router.use(async function(req, res, next){
	try{
		const allowSignup = await Config.findBy({"config_name": "allow_signup"});
		if(allowSignup.data.config_value === "true"){
			next();
		}else{
			throw new CottaError("Not Found", "Cannot find resource", 404);
		}
	}catch(err){
		next(err);
	}
});

router.post("/", async function(req, res, next){
	try{
		const result = await auth.signup(req.body.username, req.body.password, "unverified");
		res.json({
			"message": `User ${result} created`
		});
	}catch(err){
		if(err.name == "MongoError" && err.code == 11000){
			// Duplicate username
			next(new CottaError("Username not available", `Username "${req.body.username}" is already registered`));
		}else{
			next(err);
		}
	}
});

module.exports = router;