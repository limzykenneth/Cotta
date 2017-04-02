const _ = require("lodash");
const express = require("express");
const router = express.Router();
const path = require("path");
const connect = require("../database.js");
const auth = require("../auth.js");
const multer = require('multer');
const upload = multer({dest: "uploads/"});

router.get("/", function(req, res){
	res.render("account");
});

// Must be the current signed in user
router.post("/", upload.none(), function(req, res, next){
	if(req.body.username == req.session.user.username){
		next();
	}else{
		res.status(403).send("Action not allowed for current user");
	}
});

router.post("/", function(req, res){
	// Possibly do password strength check here
	if(req.body.current_password !== "" && req.body.new_password !== ""){
		auth.changePassword(req.body.username, req.body.current_password, req.body.new_password, function(err, result){
			if(err) throw err;

			res.json({
				status: "success"
			});
		});
	}
});

module.exports = router;