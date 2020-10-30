const _ = require("lodash");
const express = require("express");
const DynamicRecord = require("dynamic-record");

const router = express.Router();
const auth = require("../../utils/auth.js");
const restrict = require("../../utils/middlewares/restrict.js");
const CottaError = require("../../utils/CottaError.js");
const Users = new DynamicRecord({
	tableSlug: "_users_auth"
});

// Route: {root}/api/users/...

// GET routes
// GET self


// Everything else should be restricted
// GET all users
router.get("/", restrict.toAdministrator, async function(req, res){
	try{
		const users = await Users.all();
		_.each(users, function(el, i){
			delete el.data._id;
			delete el.data.hash;
		});

		res.json(users.data);
	}catch(err){
		next(err);
	}
});

// GET specific user
router.get("/:username", restrict.toAdministrator, async function(req, res){
	try{
		const user = await Users.findBy({username: req.params.username});
		// Remove internal ID and password hash, maybe split the db later
		delete user.data._id;
		delete user.data.hash;
		res.json(user.data);
	}catch(err){
		next(err);
	}
});


// POST routes
// POST to create a new user
router.post("/", restrict.toAdministrator, async function(req, res, next){
	try{
		const reservedUsernames = ["anonymous"];
		if(_.includes(reservedUsernames, req.body.username.toLowerCase())){
			throw new CottaError("Username not available", `"${req.body.username}" is a reserved username and cannot be registered`);
		}

		const data = req.body;
		const result = await auth.signup(data.username, data.password, "author");
		res.json({
			"message": `User "${result}" created`
		});

	}catch(err){
		if(err.name == "MongoError" && err.code == 11000){
			// Duplicate username
			next(new CottaError("Username not available", `Username "${req.body.username}" is already registered`, 409));
		}else{
			next(err);
		}
	}
});

// POST to a user (edit existing user)
router.post("/:username", restrict.toAdministrator, async function(req, res, next){
	try{
		if(req.params.username !== req.body.username){
			throw new CottaError("Request body does not match route");
		}

		if(!req.body.role){
			throw new CottaError("Request body missing field");
		}

		const username = req.body.username;
		const newRole = req.body.role;
		const user = await Users.findBy({"username": username});
		user.data.role = newRole;
		user.save().then((result) => {
			res.json({
				"message": `User "${user.data.username}" changed`
			});
		});

	}catch(err){
		next(err);
	}
});


// DELETE routes
// DELETE specific user
router.delete("/:username", restrict.toAdministrator, async function(req, res, next){
	try{
		const User = new DynamicRecord({
			tableSlug: "_users_auth"
		});

		const user = await User.findBy({"username": req.params.username});
		await user.destroy();
		res.json({
			message: `User "${req.params.username}" deleted`
		});

	}catch(err){
		if(err.message === "Model not saved in database yet."){
			next(new CottaError("User does not exist", "The user to be deleted does not exist.", 404));
		}else{
			next(err);
		}
	}
});

module.exports = router;