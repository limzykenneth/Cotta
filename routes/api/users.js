const _ = require("lodash");
const express = require("express");
const ActiveRecord = require("active-record");

const router = express.Router();
const auth = require("../../utils/auth.js");
const restrict = require("../../utils/middlewares/restrict.js");
const CharError = require("../../utils/charError.js");
const Users = new ActiveRecord("_users_auth");

// Route: {root}/api/users/...

// GET routes
// GET self


// Everything else should be restricted
// GET all users
router.get("/", restrict.toAdministrator, function(req, res){
	Users.all().then((users) => {
		_.each(users, function(el, i){
			delete el.data._id;
			delete el.data.hash;
		});

		res.json(users.data);
	});
});

// GET specific user
router.get("/:username", restrict.toAdministrator, function(req, res){
	Users.findBy({username: req.params.username}).then((user) => {
		// Remove internal ID and password hash, maybe split the db later
		delete user.data._id;
		delete user.data.hash;
		res.json(user.data);
	});
});


// POST routes
// POST to create a new user
router.post("/", restrict.toAdministrator, function(req, res, next){
	let reservedUsernames = ["Anonymous", "anonymous"];
	if(_.includes(reservedUsernames, req.body.username)){
		next(new CharError("Username not available", `${req.body.username} is a reserved username and cannot be registered`));
		return;
	}

	var data = req.body;
	auth.signup(data.username, data.password, function(err, result){
		if(err) {
			if(err.name == "MongoError" && err.code == 11000){
				// Duplicate username
				next(new CharError("Username not available", `Username ${req.body.username} is already registered`));
			}else{
				next(new CharError());
			}
			return;
		}

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
	let User = new ActiveRecord("_users_auth");

	User.findBy({"username": req.params.username}).then((user) => {
		user.destroy().then((col) => {
			res.json({
				message: `User ${req.params.username} deleted`
			});
		});
	});
});

module.exports = router;