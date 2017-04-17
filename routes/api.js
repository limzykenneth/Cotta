const express = require("express");
const connect = require("../utils/database.js");
const _ = require("lodash");

let app = express.Router();

app.get("/", function(req, res){
	res.send("<p>Welcome to the API Endpoint. Please refer to the documentation for its usage.</p>");
});

app.get("*", function(req, res, next){
	res.header("Access-Control-Allow-Origin", "*");
	next();
});

app.get("/:collection*", function(req, res, next){
	if(req.params.collection.substr(0, 1) == "_"){
		res.status(403).send({error: "Collection name may not start with _"});
	}else{
		next();
	}
});

app.get("/:collection", function (req, res, next){
	connect.then(function(db){
		return db.collection(req.params.collection).find().toArray();
	}).then(function(result){
		res.json(result);
	}).catch(function(err){
		next(err);
	});
});

app.get("/:collection/:name/:value", function(req, res, next){
	var obj = {};
	obj[req.params.name] = req.params.value;

	connect.then(function(db){
		return db.collection(req.params.collection).find(obj).toArray();
	}).then(function(){
		res.json(result);
	}).catch(function(err){
		next(err);
	});
});

app.get("/:collection/filter\\[:name\]=:value", function(req, res){
	var obj = {};
	obj[req.params.name] = req.params.value;

	connect.then(function(db){
		db.collection(req.params.collection).find(obj).toArray();
	}).then(function(result){
		res.json(result);
	}).catch(function(err){
		next(err);
	});
});

module.exports = app;