const _ = require("lodash");
const express = require("express");
const ActiveRecord = require("active-record");

const router = express.Router();
const connect = require("../../utils/database.js");
const restrict = require("../../utils/middlewares/restrict.js");
const Schemas = new ActiveRecord("_schema");

// Route: {root}/api/schema/...

// GET routes
// GET all schemas
router.get("/", restrict.toEditor, function(req, res){
	// Better to cache it somehow maybe
	// res.json(res.local.schemas);

	Schemas.all().then((schemas) => {
		res.json(schemas.data);
	});
});

// GET specified schema
router.get("/:schema", restrict.toEditor, function(req, res){
	Schemas.findBy({collectionSlug: req.params.schema}).then((schema) => {
		res.json(schema.data);
	});
});

// POST routes
// POST specified schema (add new and edit)
router.post("/", restrict.toEditor, function(req, res){
	connect.then(function(db){
		// Find collection with duplicate slug, if found, edit it
		return db.collection("_schema").find().toArray().then(function(schemas){
			var result = _.filter(schemas, {collectionSlug: req.body.collectionSlug});

			if(result.length > 0){
				// Edit schema
				return db.collection("_schema").updateOne({collectionSlug: req.body.collectionSlug}, req.body).then(function(data){
					return Promise.resolve(db);
				});
			}else{
				// Create new schema
				return db.collection("_schema").insertOne(req.body).then(function(data){
					return Promise.resolve(db);
				});
			}
		});
	}).then(function(db){
		return db.collection("_schema").findOne({collectionSlug: req.body.collectionSlug});
	}).then(function(data){
		res.json(data);
	});
});

// DELETE routes
// DELETE specified schema (and all posts in it)
router.delete("/:schema", restrict.toEditor, function(req, res){
	let Schema = new ActiveRecord("_schema");

	Schema.findBy({collectionSlug: req.params.schema}).then((schema) => {
		schema.destroy().then(() => {
			res.json({
				status: "success",
				message: "Schema deleted."
			});
		});
	});
});

module.exports = router;