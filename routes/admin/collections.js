const _ = require("lodash");
const express = require("express");
const router = express.Router();
const path = require("path");
const f = require("util").format;
const MongoClient = require('mongodb').MongoClient;

let mongoURL = f("mongodb://%s:%s@%s/%s", process.env.mongo_user, process.env.mongo_pass, process.env.mongo_server, process.env.mongo_db_name);

router.get("/", function(req, res){
	res.render("collections");
});

module.exports = router;