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
	const reservedUsernames = ["Anonymous", "anonymous"];
	if(_.includes(reservedUsernames, req.body.username)){
		next(new CharError("Username not available", `"${req.body.username}" is a reserved username and cannot be registered`));
		return;
	}

	const data = req.body;
	auth.signup(data.username, data.password, "author", function(err, result){
		if(err) {
			if(err.name == "MongoError" && err.code == 11000){
				// Duplicate username
				next(new CharError("Username not available", `Username "${req.body.username}" is already registered`, 409));
			}else{
				next(new CharError());
			}
			return;
		}

		res.json({
			"message": `User "${result}" created`
		});
	});
});

// POST to a user (edit existing user)
router.post("/:username", restrict.toAdministrator, function(req, res, next){
	if(req.params.username === req.body.username){
		if(req.body.role){
			const username = req.body.username;
			const newRole = req.body.role;
			Users.findBy({"username": username}).then((user) => {
				user.data.role = newRole;
				user.save().then((result) => {
					res.json({
						"message": `User "${user.data.username}" changed`
					});
				});
			});
		}else{
			next(new CharError("Request body missing field"));
		}
	}else{
		next(new CharError("Request body does not match route"));
	}
});


// DELETE routes
// DELETE specific user
router.delete("/:username", restrict.toAdministrator, function(req, res, next){
	const User = new ActiveRecord({
		tableSlug: "_users_auth"
	});

	User.findBy({"username": req.params.username}).then((user) => {
		return user.destroy();
	}).then((col) => {
		res.json({
			message: `User "${req.params.username}" deleted`
		});
	}).catch((err) => {
		if(err.message === "Model not saved in database yet."){
			next(new CharError("User does not exist", "The user to be deleted does not exist.", 404));
		}else{
			next(err);
		}
	});
});

module.exports = router;