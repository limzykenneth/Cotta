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
		res.json(data);
	});
});

module.exports = router;