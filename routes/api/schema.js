const _ = require("lodash");
const express = require("express");
const ActiveRecord = require("active-record");

const router = express.Router();
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
	let Schema = new ActiveRecord("_schema");

	// Find collection with duplicate slug, if found, edit it
	Schema.where({collectionSlug: req.body.collectionSlug}).then((schemas) => {
		if(schemas.length > 0){
			// Edit schema
			schemas[0].data = req.body;
			return schemas[0].save();
		}else{
			// Create new schema
			let schema = new Schema.Model(req.body);
			return schema.save();
		}
	}).then(() => {
		Schema.findBy({collectionSlug: req.body.collectionSlug}).then((schema) => {
			res.json(schema.data);
		});
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