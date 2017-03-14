const express = require("express");
const MongoClient = require('mongodb').MongoClient;
const f = require("util").format;
let app = express.Router();

let mongoURL = f("mongodb://%s:%s@%s/%s", process.env.mongo_user, process.env.mongo_pass, process.env.mongo_server, process.env.mongo_db_name);

app.get("/", function(req, res){
	res.send("<p>Welcome to the API Endpoint. Please refer to the documentation for its usage.</p>");
});

app.get("*", function(req, res, next){
	res.header("Access-Control-Allow-Origin", "*");
	next();
});

app.get("/:collection", function (req, res){
	var collection = req.params.collection;
	MongoClient.connect(mongoURL, function (err, db) {
		if (err) throw err;

		db.collection(collection).find().toArray(function (err, result) {
			if (err) throw err;
			res.json(result);
		});

		db.close();
	});
});

app.get("/:collection/:name/:value", function(req, res){
	var collection = req.params.collection;
	var obj = {};
	obj[req.params.name] = req.params.value;

	MongoClient.connect(mongoURL, function (err, db) {
		if (err) throw err;

		db.collection(collection).find(obj).toArray(function (err, result) {
			if (err) throw err;
			res.json(result);
		});

		db.close();
	});
});

app.get("/:collection/filter\\[:name\]=:value", function(req, res){
	var collection = req.params.collection;
	var obj = {};
	obj[req.params.name] = req.params.value;

	MongoClient.connect(mongoURL, function (err, db) {
		if (err) throw err;

		db.collection(collection).find(obj).toArray(function (err, result) {
			if (err) throw err;
			res.json(result);
		});

		db.close();
	});
});

module.exports = app;