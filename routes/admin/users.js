const _ = require("lodash");
const express = require("express");
const router = express.Router();
const path = require("path");
const connect = require("../database.js");

router.get("/", function(req, res){
	res.send("Not yet implemented...");
});

router.get("/:id", function(req, res){
	res.send("Not yet implemented...");
});

router.post("/:id", function(req, res){
	res.send("Not yet implemented...");
});

module.exports = router;