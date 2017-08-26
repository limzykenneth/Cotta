const _ = require("lodash");
const express = require("express");
const router = express.Router();
const connect = require("../../utils/database.js");

// Route: {root}/api/users/...

// GET routes
// GET self


// Everything else should be restricted
// GET all users
router.get("/", function(req, res){
	connect.then(function(db){
		return db.collection("_users_auth").find().toArray();
	}).then(function(data){
		// Remove internal ID and password hash, maybe split the db later
		_.each(data, function(el, i){
			delete el._id;
			delete el.hash;
		});
		res.json(data);
	});
});

// GET specific user
router.get("/:username", function(req, res){
	connect.then(function(db){
		return db.collection("_users_auth").findOne({username: req.params.username});
	}).then(function(data){
		// Remove internal ID and password hash, maybe split the db later
		delete data._id;
		delete data.hash;
		res.json(data);
	});
});


// POST routes
// POST to create a new user
router.post("/", function(req, res){
	res.json({
		message: "Implementation pending"
	});
});

// POST to a user (edit existing user)
router.post("/:username", function(){
	res.json({
		message: "Implementation pending"
	});
});


// DELETE routes
// DELETE specific user
router.post("/:username", function(){
	res.json({
		message: "Implementation pending"
	});
});

module.exports = router;