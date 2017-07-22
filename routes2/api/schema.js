const _ = require("lodash");
const express = require("express");
const router = express.Router();
const connect = require("../../utils/database.js");

// Route: {root}/api/schema/...

// GET routes
// GET all schemas
router.get("/", function(req, res){
	// Better to cache it somehow maybe
	// res.json(res.local.schemas);

	connect.then(function(db){
		return db.collection("_schema").find().toArray();
	}).then(function(data){
		res.json(data);
	});
});

// GET specified schema
router.get("/:schema", function(req, res){
	connect.then(function(db){
		return db.collection("_schema").findOne({collectionSlug: req.params.schema});
	}).then(function(schema){
		res.json(schema);
	});
});

// POST routes
// POST specified schema (add new and edit)
router.post("/:schema", function(req, res){
	connect.then(function(db){
		// Find collection with duplicate slug, if found, edit it
		var schemas = db.collection("_schema").find().toArray();
		var result = _.filter(schemas, {collectionSlug: req.params.collectionSlug});

		if(result.length > 0){
			// Edit schema
			return db.collection("_schema").updateOne({collectionSlug: req.params.schema}, req.body);
		}else{
			// Create new schema
			return db.collection("_schema").insertOne(req.body);
		}
	}).then(function(db){
		res.json({
			status: "success",
			message: "Schema update successful."
		});
	});
});

// DELETE routes
// DELETE specified schema (and all posts in it)
router.delete("/:schema", function(req, res){
	connect.then(function(db){
		return db.collection("_schema").deleteOne({collectionSlug: req.params.schema});
	}).then(function(db){
		res.json({
			status: "success",
			message: "Schema deleted."
		});
	});
});

module.exports = router;