const _ = require("lodash");
const express = require("express");
const router = express.Router();
const auth = require("../../utils/auth.js");
const CharError = require("../../utils/charError.js");

// Route: {root}/api/account/...

// Change password
router.post("/change_password", function(req, res, next){
	auth.changePassword(req.body.username, req.body.password, req.body.newPassword, function(err, result){
		if(err) {
			const error = new CharError();

			if(err.message == "invalid password"){
				error.title = "Authentication Failed";
				error.message = "Username or password provided is incorrect";
				error.status = 401;
			}

			next(error);

			return;
		}

		res.json({
			message: `User ${req.body.username}'s password changed`
		});
	});
});


module.exports = router;