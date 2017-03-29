const _ = require("lodash");
const express = require("express");
const router = express.Router();
const path = require("path");
const connect = require("../database.js");
const uploadSchemas = require("../upload.js");

// List all collections and their schemas
router.get("/", function(req, res){
	connect.then(function(db){
		db.collection("_schema").find().toArray(function(err, results){
			if(err) throw err;

			res.render("collections", {
				data: results
			});
		});
	});
});

// Render page to create new collection
router.get("/new", function(req, res){
	res.render("create-collections");
});

// Render page to edit existing collection
router.get("/edit/:collection", function(req, res){
	connect.then(function(db){
		db.collection("_schema").findOne({collectionSlug: req.params.collection}, function(err, result){
			var obj = result;
			obj[schemas] = res.locals.schemas;
			res.render("edit-collection", result);
		});
	});
});

// List all models under the specified collection
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

// Render page to create new model under specified collection
router.get("/:collection/new", function(req, res){
	connect.then(function(db){
		db.collection("_schema").findOne({collectionSlug: req.params.collection}, function(err, result){
			res.render("create-model", result);
		});
	});
});

// Create new model under specified collection
router.post("/:collection/new", uploadSchemas, function(req, res){
	var data = req.body;

	_.each(req.files, function(el, i){
		data[el[0].fieldname] = el[0].path;
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

// Render page showing data of specified model
router.get("/:collection/:id", function(req, res){
	res.send("Not yet implemented...");
});

// Render page to edit data of specified model
router.get("/:collection/:id/edit", function(req, res){
	res.send("Not yet implemented...");
});

// Edit data of specified model
router.post("/:collection/:id/edit", function(req, res){
	res.send("Not yet implemented...");
});

module.exports = router;