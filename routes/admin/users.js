const _ = require("lodash");
const express = require("express");
const router = express.Router();
const path = require("path");
const connect = require("../database.js");

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