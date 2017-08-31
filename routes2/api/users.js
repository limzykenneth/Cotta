const _ = require("lodash");
const express = require("express");
const router = express.Router();
const connect = require("../../utils/database.js");
const auth = require("../../utils/auth.js");
const restrict = require("../../utils/middlewares/restrict2.js");

// Route: {root}/api/users/...

// GET routes
// GET self


// Everything else should be restricted
// GET all users
router.get("/", restrict.toAdministrator, function(req, res){
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
router.get("/:username", restrict.toAdministrator, function(req, res){
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
router.post("/", restrict.toAdministrator, function(req, res, next){
	if(req.body.username == "Anonymous"){
		next(new Error("Cannot register as " + req.body.username));
	}

	var data = req.body;
	auth.signup(data.username, data.password, function(err, result){
		if(err) next(err);

		res.json(result);
	});
});

// POST to a user (edit existing user)
// router.post("/:username", restrict.toAdministrator, function(req, res, next){
// 	auth.changePassword(req.params.username, req.body.password, req.body.newPassword, function(err, user){
// 		if(err) next(err);

// 		res.json({
// 			message: `User ${req.params.username}'s password changed`
// 		});
// 	});
// });


// DELETE routes
// DELETE specific user
router.delete("/:username", restrict.toAdministrator, function(req, res){
	connect.then(function(db){
		return db.collection("_users_auth").deleteOne({"username": req.params.username});
	}).then(function(){
		res.json({
			message: `User ${req.params.username} deleted`
		});
	});
});

module.exports = router;