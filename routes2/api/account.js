const _ = require("lodash");
const express = require("express");
const router = express.Router();
const connect = require("../../utils/database.js");
const auth = require("../../utils/auth.js");

// Route: {root}/api/account/...

// Change password
router.post("/change_password", function(req, res, next){
	auth.changePassword(req.user.username, req.body.password, req.body.newPassword, function(err, result){
		if(err) next(err);

		res.json({
			message: `User ${req.user.username}'s password changed`
		});
	});
});


module.exports = router;