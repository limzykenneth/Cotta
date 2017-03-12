const express = require("express");
const MongoClient = require('mongodb').MongoClient;
const f = require("util").format;
let app = express.Router();

let authCred = {
	user: "express",
	password: "express"
};
let mongoURL = f("mongodb://%s:%s@localhost:27017/express_api_test", authCred.user, authCred.password);

// let testData;
let testData = require("../test-data.json");

app.get("/", function(req, res){
	res.send("<p>Welcome to the API Endpoint. Please refer to the documentation for its usage.</p>");
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
	// res.json(testData);
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