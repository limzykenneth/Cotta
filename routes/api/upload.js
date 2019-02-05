// Main entry point for API uploading routes
require("dotenv").config();
const Promise = require("bluebird");
const path = require("path");
const _ = require("lodash");
const moment = require("moment");
const randomstring = require("randomstring");
const ActiveRecord = require("active-record");

const express = require("express");
const router = express.Router();

const restrict = require("../../utils/middlewares/restrict.js");

const Files = new ActiveRecord({
	tableSlug: "files_upload"
});

// Configurations (hardcoded for now, should remove in the future)
const limits = {
	// Change to some integer value to limit file size
	fileSize: Infinity
};

router.get("/", restrict.toAuthor, function(req, res, next) {
	res.json({
		message: "Upload endpoint"
	});
});

router.post("/", restrict.toAuthor, function(req, res, next){

});

module.exports = router;