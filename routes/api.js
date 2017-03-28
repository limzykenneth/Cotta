const express = require("express");
let app = express.Router();

let connect = require("./database.js");

app.get("/", function(req, res){
	res.send("<p>Welcome to the API Endpoint. Please refer to the documentation for its usage.</p>");
});

app.get("*", function(req, res, next){
	res.header("Access-Control-Allow-Origin", "*");
	next();
});

app.get("/:collection", function(req, res, next){
	if(req.params.collection.substr(0, 1) == "_"){
		res.status(403).send({error: "Collection name may not start with _"});
	}else{
		next();
	}
});

app.get("/:collection", function (req, res){
	var collection = req.params.collection;

	connect.then(function(db){
		db.collection(collection).find().toArray(function (err, result) {
			if (err) throw err;
			res.json(result);
		});
	});
});

app.get("/:collection/:name/:value", function(req, res){
	var collection = req.params.collection;
	var obj = {};
	obj[req.params.name] = req.params.value;

	connect.then(function(db){
		db.collection(collection).find(obj).toArray(function (err, result) {
			if (err) throw err;
			res.json(result);
		});
	});
});

app.get("/:collection/filter\\[:name\]=:value", function(req, res){
	var collection = req.params.collection;
	var obj = {};
	obj[req.params.name] = req.params.value;

	connect.then(function(db){
		db.collection(collection).find(obj).toArray(function (err, result) {
			if (err) throw err;
			res.json(result);
		});
	});
});

module.exports = app;