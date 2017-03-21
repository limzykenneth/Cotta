const _ = require("lodash");
const express = require("express");
const router = express.Router();
const path = require("path");
const f = require("util").format;
const MongoClient = require('mongodb').MongoClient;

let mongoURL = f("mongodb://%s:%s@%s/%s", process.env.mongo_user, process.env.mongo_pass, process.env.mongo_server, process.env.mongo_db_name);

router.get("/", function(req, res){
	MongoClient.connect(mongoURL, function(err, db){
		if(err) throw err;

		db.collection("_schema").find().toArray(function(err, results){
			if(err) throw err;

			res.render("collections", {data: results});

			db.close();
		});
	});
});

router.get("/new", function(req, res){
	res.render("create-collections");
});

router.get("/edit/:collection", function(req, res){
	res.send("Not implemented yet...");
});

router.post("/edit/:collection", function(req, res){
	res.send("Not implemented yet...");
});

router.get("/:collection", function(req, res){
	res.render("models", {collectionName: "(Pending...)"});
});

router.get("/:collection/new", function(req, res){
	res.send("Not implemented yet...");
});

router.post("/:collection/new", function(req, res){
	res.send("Not implemented yet...");
});

module.exports = router;