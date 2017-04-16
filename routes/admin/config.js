const _ = require("lodash");
const express = require("express");
const router = express.Router();
const path = require("path");
const connect = require("../../utils/database.js");
const restricted = require("../../utils/middlewares/restrict.js");

router.get("/", restricted.toAdministrator, function(req, res){
	res.send("Not yet implemented...");
});

module.exports = router;