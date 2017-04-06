const _ = require("lodash");
const express = require("express");
const router = express.Router();
const path = require("path");
const connect = require("../database.js");
const uploadSchemas = require("../upload.js");
const autoIncrement = require("mongodb-autoincrement");
const moment = require("moment");

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
			obj.schemas = res.locals.schemas;
			res.render("edit-collection", result);
		});
	});
});

// List all models under the specified collection
router.get("/:collection", function(req, res, next){
	connect.then(function(db){
		db.collection("_schema").findOne({collectionSlug: req.params.collection}, function(err, schema){
			if(err) throw err;

			if(typeof schema == "undefined") {
				next();
			}else{
				db.collection(schema.collectionSlug).find().toArray(function(err, models){
					if(err) throw err;

					res.render("models", {
						collectionName: schema.collectionName,
						collectionSlug: schema.collectionSlug,
						schema: schema,
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

	data._metadata = {
		created_by: req.session.user.username,
		date_created: moment.utc().format(),
		date_modified: moment.utc().format()
	};
	connect.then(function(db){
		autoIncrement.setDefaults({collection: "_counters"});
		autoIncrement.getNextSequence(db, req.params.collection, function(err, autoIndex){
			if(err) throw err;

			data._uid = autoIndex;
			db.collection(req.params.collection).createIndex({"_uid": 1}, {unique: true}, function(err){
				if(err) throw err;

				db.collection(req.params.collection).insertOne(data, function(err){
					if(err) throw err;

					res.json({
						status: "success"
					});
				});
			});
		});
	});
});

// Prepare data for model rendering
router.get("/:collection/:id/?*", function(req, res, next){
	connect.getSchemaModel(req.params.collection, req.params.id).then(function(r){
		var data = r.schema;
		data._uid = r.model._uid;
		_.each(r.schema.fields, function(field, i){
			field.value = r.model[field.slug];
		});

		req.modelData = data;
		next();
	}).catch(function(err){
		throw err;
	});
});

// Render page showing data of specified model
router.get("/:collection/:id", function(req, res){
	res.render("model", req.modelData);
});

// Render page to edit data of specified model
router.get("/:collection/:id/edit", function(req, res){
	res.render("edit-model", req.modelData);
});

// Edit data of specified model
router.post("/:collection/:id/edit", uploadSchemas, function(req, res){
	var data = req.body;

	_.each(req.files, function(el, i){
		data[el[0].fieldname] = el[0].path;
	});

	connect.then(function(db){
		data._uid = parseInt(req.params.id);
		data._metadata.date_modified = moment.utc().format();
		// Probably don't want to use $set
		db.collection(req.params.collection).updateOne({"_uid": parseInt(req.params.id)}, {$set: data}, function(err){
			if(err) throw err;

			res.json({
				status: "success"
			});
		});
	});
});

module.exports = router;