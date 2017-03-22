const _ = require("lodash");
const express = require("express");
const router = express.Router();
const path = require("path");

let connect = require("../database.js");

router.get("/", function(req, res){
	connect.then(function(db){
		db.collection("_schema").find().toArray(function(err, results){
			if(err) throw err;

			res.render("collections", {data: results});
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

router.get("/:collection", function(req, res, next){
	connect.then(function(db){
		db.collection("_schema").find().toArray(function(err, results){
			if(err) throw err;

			var schema = _.find(results, function(el){
				return el.collectionSlug == req.params.collection;
			});

			if(typeof schema == "undefined") {
				next();
			}else{
				db.collection(schema.collectionSlug).find().toArray(function(err, models){
					if(err) throw err;

					res.render("models", {
						collectionName: schema.collectionName,
						collectionSlug: schema.collectionSlug,
						data: models
					});
				});
			}
		});
	}).catch(function(err){
		concole.log(err);
	});
});

router.get("/:collection/new", function(req, res){
	connect.then(function(db){
		db.collection("_schema").findOne({collectionSlug: req.params.collection}, function(err, result){
			res.render("create-model", result);
		});
	});
});

router.post("/:collection/new", function(req, res){
	var data = {};

	_.each(req.body, function(el){
		data[el.name] = el.value;
	});
	connect.then(function(db){
		db.collection(req.params.collection).insertOne(data, function(err){
			if(err) throw err;

			res.json({
				status: "success"
			});
		});
	});
});

module.exports = router;