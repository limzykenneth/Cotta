const _ = require("lodash");
const express = require("express");
const DynamicRecord = require("dynamic-record");

const router = express.Router();
const restrict = require("../../utils/middlewares/restrict.js");
const AppCollections = new DynamicRecord({
	tableSlug: "_app_collections"
});

//-----------------------
// Pattern here is not in line with implemented active record pattern -----------
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
router.post("/", restrict.toEditor, function(req, res){
	const Schema = new DynamicRecord.DynamicSchema();

	AppCollections.findBy({"_$id": req.body.tableSlug}).then((appCollection) => {
		const schemaDefinition = req.body.definition;
		const regex = /^app_/;

		if(appCollection.data === null){
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
				"isAutoIncrement": "true"
			};

			Schema.createTable({
				$schema: "http://json-schema.org/draft-07/schema#",
				$id: req.body.tableSlug,
				title: req.body.tableName,
				properties: definition,
				type: "object",
				required: ["_metadata", "_uid"]
			}).then(() => {
				return appCollection.save();
			}).then(() => {
				res.json(Schema);
			});
		}else{
			// Edit existing schema
			_.each(schemaDefinition, (el, key) => {
				_.each(el, (val, prop) => {
					if(regex.test(prop)){
						appCollection.data.fields[key][prop] = val;
					}
				});
			});

			appCollection.save().then(() => {
				return Schema.read(req.body.tableSlug);
			}).then(() => {
				if(Schema.tableName !== req.body.tableName){
					return Schema.renameTable(req.body.tableSlug, req.body.tableName);
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
				res.json(Schema);
			});
		}
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