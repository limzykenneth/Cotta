const _ = require("lodash");
const express = require("express");
const DynamicRecord = require("dynamic-record");

const router = express.Router();
const restrict = require("../../utils/middlewares/restrict.js");
const CottaError = require("../../utils/CottaError.js");
const AppCollections = new DynamicRecord({
	tableSlug: "_app_collections"
});


//-----------------------
// Route: {root}/api/schema/...

// GET routes
// GET all schemas
router.get("/", restrict.toEditor, function(req, res, next){
	const appSchemas = [];
	AppCollections.all().then((schemaNames) => {
		const promises = [];

		_.each(schemaNames, (schemaName) => {
			const Schema = new DynamicRecord.DynamicSchema();
			appSchemas.push(schemaName);
			promises.push(Schema.read(schemaName.data._$id));
		});

		return Promise.all(promises);
	}).then((schemas) => {
		_.each(schemas, (schema, i) => {
			const appSchema = appSchemas[i];

			delete schema.definition._metadata;
			delete schema.definition._uid;

			_.each(schema.definition, (field, key) => {
				_.each(appSchema.data.fields[key], (val, prop) => {
					field[prop] = val;
				});
			});
		});
		res.json(schemas);
	}).catch((err) => {
		next(err);
	});
});

// GET specified schema
router.get("/:schema", restrict.toEditor, function(req, res, next){
	const Schema = new DynamicRecord.DynamicSchema();

	let appSchema;
	AppCollections.findBy({"_$id": req.params.schema}).then((schemaName) => {
		appSchema = schemaName;
		return Schema.read(schemaName.data._$id);
	}).then((schema) => {
		delete schema.definition._metadata;
		delete schema.definition._uid;
		_.each(schema.definition, (field, key) => {
			_.each(appSchema.data.fields[key], (val, prop) => {
				field[prop] = val;
			});
		});

		res.json(schema);
	}).catch((err) => {
		next(err);
	});
});

// POST routes
// POST specified schema (add new and edit)
router.post("/", restrict.toEditor, function(req, res, next){
	const Schema = new DynamicRecord.DynamicSchema();

	AppCollections.findBy({"_$id": req.body.tableSlug}).then((appCollection) => {
		const schemaDefinition = req.body.definition;
		const regex = /^app_/;

		if(appCollection === null){
			appCollection = new AppCollections.Model();
			// Insert new schema
			appCollection.data = {};
			appCollection.data._$id = req.body.tableSlug;
			appCollection.data.fields = _.reduce(schemaDefinition, (result, el, key) => {
				result[key] = {};

				_.each(el, (val, prop) => {
					if(regex.test(prop)){
						result[key][prop] = val;
					}
				});
				return result;
			}, {});

			const definition = _.reduce(schemaDefinition, (result, el, key) => {
				result[key] = {};
				_.each(el, (val, prop) => {
					if(!regex.test(prop)){
						result[key][prop] = val;
					}
				});

				return result;
			}, {});

			definition._metadata = {
				"type": "object",
				"properties": {
					"created_by": {
						"type": "string"
					},
					"date_created": {
						"type": "string"
					},
					"date_modified": {
						"type": "string"
					}
				}
			};
			definition._uid = {
				"type": "number",
				"isIndex": true,
				"isAutoIncrement": true
			};

			return appCollection.save().then(() => {
				return Schema.createTable({
					$schema: "http://json-schema.org/draft-07/schema#",
					$id: req.body.tableSlug,
					title: req.body.tableName,
					properties: definition,
					type: "object",
					required: ["_metadata", "_uid"]
				});
			}).then(() => {
				res.json(Schema);
			});
		}else{
			console.log(appCollection);
			return Promise.reject(new CottaError("Schema exist", `Schema with name ${req.body.tableSlug} already exist`, 400));
		}
	}).catch((err) => {
		next(err);
	});
});

router.post("/:schema", restrict.toEditor, function(req, res, next){
	const Schema = new DynamicRecord.DynamicSchema();

	AppCollections.findBy({"_$id": req.params.schema}).then((appCollection) => {
		if(appCollection === null){
			// Schema does not exist in database
			return Promise.reject(new CottaError("Not Found", `Schema with slug "${req.params.schema}" does not exist.`, 404));
		}else{
			const schemaDefinition = req.body.definition;
			const regex = /^app_/;

			_.each(schemaDefinition, (el, key) => {
				if(appCollection.data.fields[key] === undefined){
					appCollection.data.fields[key] = {};
				}
				_.each(el, (val, prop) => {
					if(regex.test(prop)){
						appCollection.data.fields[key][prop] = val;
					}
				});
			});

			if(req.params.schema === req.body.tableSlug){
				// Table name did not change
				appCollection.save().then(() => {
					return Schema.read(req.params.schema);
				}).then(() => {
					if(Schema.tableName !== req.body.tableName){
						return Promise.reject(new CottaError("Not implemented", "Changing name or slug of collection not yet implemented", 501));
						// return Schema.renameTable(req.params.schema, req.body.tableName);
					}else{
						return Promise.resolve(Schema);
					}
				}).then(() => {
					const definition = _.reduce(schemaDefinition, (result, el, key) => {
						result[key] = {};
						_.each(el, (val, prop) => {
							if(!regex.test(prop)){
								result[key][prop] = val;
							}
						});

						return result;
					}, {});

					definition._metadata = {
						"type": "object",
						"properties": {
							"created_by": {
								"type": "string"
							},
							"date_created": {
								"type": "string"
							},
							"date_modified": {
								"type": "string"
							}
						}
					};
					definition._uid = {
						"type": "number",
						"isAutoIncrement": "true"
					};

					return Schema.define(definition);
				}).then(() => {
					_.each(schemaDefinition, (el, key) => {
						Schema.definition[key] = el;
					});
					res.json(Schema);
				}).catch((err) => {
					next(err);
				});
			}else{
				// Table name changed
				// NOTE: implementation pending
				return Promise.resolve(new AppCollections.Model());
			}
		}
	}).then((appCollection) => {
		// appCollection.save().then(() => {
		// });
		if(appCollection){
			return Promise.reject(new CottaError("Not implemented", "Changing name or slug of collection not yet implemented", 501));
		}else{
			return;
		}
	}).catch((err) => {
		next(err);
	});
});

// DELETE routes
// DELETE specified schema (and all posts in it)
router.delete("/:schema", restrict.toEditor, function(req, res, next){
	const Schema = new DynamicRecord.DynamicSchema();
	let collectionName;

	Schema.read(req.params.schema).then(() => {
		collectionName = Schema.tableName;
		return Schema.dropTable();
	}).then(() => {
		return AppCollections.findBy({"_$id": req.params.schema});
	}).then((appCollection) => {
		return appCollection.destroy();
	}).then(() => {
		res.json({
			status: "success",
			message: `Schema "${collectionName}" deleted.`
		});
	}).catch((err) => {
		next(err);
	});
});

module.exports = router;