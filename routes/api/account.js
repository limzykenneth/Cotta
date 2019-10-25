const _ = require("lodash");
const express = require("express");
const router = express.Router();
const auth = require("../../utils/auth.js");
const CottaError = require("../../utils/CottaError.js");
const restrict = require("../../utils/middlewares/restrict.js");

// Route: {root}/api/account/...

// Change password
router.post("/change_password", restrict.toAuthor, function(req, res, next){
	auth.changePassword(req.body.username, req.body.password, req.body.newPassword).then((result) => {
		res.json({
			message: `User "${req.body.username}" password changed`
		});
	}).catch((err) => {
		next(new CottaError("Invalid login details", "The username or password provided is incorrect.", 403));
	});
});


module.exports = router;