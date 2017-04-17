const _ = require("lodash");
const express = require("express");
const router = express.Router();
const path = require("path");
const connect = require("../../utils/database.js");
const auth = require("../../utils/auth.js");
const multerNone = require('multer')().none();

// Setting locals
router.use(function(req, res, next){
	res.locals.title = "My Account";
	next();
});

router.get("/", function(req, res){
	res.render("account");
});

// Must be the current signed in user
// Rethink required: some way to change username, maybe with email as well
// Should keep this or check authentication to prevent abuse
router.post("/", multerNone, function(req, res, next){
	if(req.body.username == req.session.user.username){
		next();
	}else{
		res.status(403).send("Action not allowed for current user");
	}
});

// Edit info of current signed in user
router.post("/", function(req, res, next){
	// Change current user password
	// Possibly do password strength check here
	if(req.body.current_password !== "" && req.body.new_password !== ""){

		// auth.changePassword already takes care of authentication before password change
		auth.changePassword(req.body.username, req.body.current_password, req.body.new_password, function(err, result){
			if(err) {
				next(err);
			}else{
				res.json({
					status: "success"
				});
			}
		});

	}
});

module.exports = router;