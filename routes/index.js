var express = require("express");
var router = express.Router();

/* Redirect to Browsersync frontend. Use in dev only. */
router.get("/", function(req, res){
	res.redirect("http://localhost:3000");
});

module.exports = router;
