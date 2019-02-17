const _ = require("lodash");
const express = require("express");
const ActiveRecord = require("active-record");

const router = express.Router();
const auth = require("../../utils/auth.js");
const restrict = require("../../utils/middlewares/restrict.js");
const CharError = require("../../utils/charError.js");
const Users = new ActiveRecord({
	tableSlug: "_users_auth"
});

router.post("/", function(req, res, next){
	auth.signup(req.body.username, req.body.password, "unverified", function(err, result){
		if(err) {
			if(err.name == "MongoError" && err.code == 11000){
				// Duplicate username
				next(new CharError("Username not available", `Username "${req.body.username}" is already registered`));
			}else{
				next(new CharError());
			}
			return;
		}

		res.json({
			"message": `User ${result} created`
		});
	});
});

module.exports = router;