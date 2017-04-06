const _ = require("lodash");
const express = require("express");
const router = express.Router();
const path = require("path");
const connect = require("../../utils/database.js");

// Setting locals
router.use(function(req, res, next){
	res.locals.title = "Users";
	next();
});

router.get("/", function(req, res){
	connect.then(function(db){
		db.collection("_users_auth").find().toArray(function(err, results){
			res.render("users", {users: results});
		});
	});
});

router.get("/:id", function(req, res){
	res.send("Not yet implemented...");
});

router.post("/:id", function(req, res){
	res.send("Not yet implemented...");
});

module.exports = router;