const _ = require("lodash");
const express = require("express");
const router = express.Router();
const path = require("path");
const connect = require("../../utils/database.js");
const uploadSchemas = require("../../utils/middlewares/upload.js");
const restricted = require("../../utils/middlewares/restrict.js");
const moment = require("moment");
const Promise = require("bluebird");
const autoIncrement = require("mongodb-autoincrement");
Promise.promisifyAll(autoIncrement);

// Setting locals
router.use(function(req, res, next){
	res.locals.title = "Collections";
	next();
});

// List all collections and their schemas
router.get("/", function(req, res){
	res.render("collections", {
		data: res.locals.schemas
	});
});

// Render page to create new collection
router.get("/new", restricted.toEditor, function(req, res){
	res.render("create-collections");
});

// Render page to edit existing collection
router.get("/edit/:collection", restricted.toEditor, function(req, res, next){
	var schema = _.find(res.locals.schemas, {collectionSlug: req.params.collection});
	res.render("edit-collection", schema);
});

// Models ----------------------------------------------------------------------------
// Setting locals
router.use(function(req, res, next){
	res.locals.title = "Models";
	next();
});

// List all models under the specified collection
router.get("/:collection", function(req, res, next){
	connect.then(function(db){
		// Get schema of the specified collection
		var schema = _.find(res.locals.schemas, {collectionSlug: req.params.collection});

		// No need to continue if schema doesn't exist
		if(typeof schema == "undefined") {
			next();
		}else{
			// Get models of the specified collection
			db.collection(schema.collectionSlug).find().toArray().then(function(models){
				res.render("models", {
					collectionName: schema.collectionName,
					collectionSlug: schema.collectionSlug,
					schema: schema,
					data: models
				});
			});
		}
	}).catch(function(err){
		next(err);
	});
});

// Render page to create new model under specified collection
router.get("/:collection/new", function(req, res){
	connect.then(function(db){
		db.collection("_schema").findOne({collectionSlug: req.params.collection}).then(function(result){
			res.render("create-model", result);
		});
	}).catch(function(err){
		next(err);
	});
});

// Create new model under specified collection
router.post("/:collection/new", uploadSchemas, function(req, res){
	var data = req.body;
	var schema = _.find(res.locals.schemas, {collectionSlug: req.params.collection});

	// Save the uploaded file's path as a field value
	_.each(req.files, function(el, i){
		data[el[0].fieldname] = path.join(el[0].path);
	});

	// Create metadata
	data._metadata = {
		created_by: req.session.user.username,
		date_created: moment.utc().format(),
		date_modified: moment.utc().format()
	};

	_.each(schema.fields, function(field){
		if(field.type == "checkbox" && !Array.isArray(data[field.slug])){
			let buffer = data[field.slug];
			data[field.slug] = [buffer];
		}
	});

	connect.then(function(db){
		// Set increment index (should be abstracted if RDBS is to be used)
		autoIncrement.setDefaults({collection: "_counters"});
		return autoIncrement.getNextSequenceAsync(db, req.params.collection).then(function(autoIndex){
			// Set unique auto incrementing index
			data._uid = autoIndex;
			return Promise.resolve(db);
		});
	}).then(function(db){
		// Create index and ensure it is unique in database
		return db.collection(req.params.collection).createIndex({"_uid": 1}, {unique: true}).then(function(){
			return Promise.resolve(db);
		});
	}).then(function(db){
		// Insert data into database under specified collection
		Promise.join(
			db.collection(req.params.collection).insertOne(data),
			db.collection("_users_auth").updateOne({username: req.session.user.username},
				{
					$addToSet:{
						models: `${req.params.collection}.${data._uid}`
					}
				}),
			function(){
				res.json({
					status: "success"
				});
			}
		);
	}).catch(function(err){
		next(err);
	});
});

// Prepare data for model rendering
router.get(["/:collection/:id", "/:collection/:id/edit"], function(req, res, next){
	connect.getSchemaModel(req.params.collection, req.params.id).then(function(r){
		var data = r.schema;
		data._uid = r.model._uid;

		// Prepare model data for rendering
		_.each(data.fields, function(field, i){
			field.value = r.model[field.slug];
		});

		// Save prepared model data in request object to be used by the next middleware
		req.modelData = data;
		next();
	}).catch(function(err){
		next(err);
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
	connect.then(function(db){
		// Find model to be edited
		db.collection(req.params.collection).findOne({"_uid": parseInt(req.params.id)}, function(err, model){
			if(err) throw err;

			var data = req.body;
			var schema = _.find(res.locals.schemas, {collectionSlug: req.params.collection});

			// Save the uploaded file's path as a field value
			_.each(req.files, function(el, i){
				data[el[0].fieldname] = el[0].path;
			});

			// Set unique ID
			data._uid = parseInt(req.params.id);
			// Set metadata, changing only date modified
			data._metadata = {
				created_by: model._metadata.created_by,
				date_created: model._metadata.date_created,
				date_modified: moment.utc().format()
			};

			_.each(schema.fields, function(field){
				if(field.type == "checkbox" && !Array.isArray(data[field.slug])){
					let buffer = data[field.slug];
					data[field.slug] = [buffer];
				}
			});

			// Probably don't want to use $set (maybe dunno)
			db.collection(req.params.collection).updateOne({"_uid": parseInt(req.params.id)}, {$set: data}, function(err){
				if(err) throw err;

				res.json({
					status: "success"
				});
			});
		});
	});
});

// Delete specified model from database
router.post("/:collection/:id", function(req, res, next){
	// HTML forms don't support DELETE action, this is a workaround
	if(req.body._method === "delete"){
		connect.then(function(db){
			db.collection(req.params.collection).findOne({"_uid": parseInt(req.params.id)}, function(err, model){
				if(err) throw err;

				// You can only delete models belonging to you unless you are an editor or an administrator
				if(req.session.user.username == model._metadata.created_by ||
					req.session.user.role == "administrator" ||
					req.session.user.role == "editor"){

					// Delete model under specified collection with specified ID
					db.collection(req.params.collection).deleteOne({"_uid": parseInt(req.params.id)}, function(err){
						if(err) throw err;

						// Delete model's entry in user associated with the model
						db.collection("_users_auth").updateOne({username: model._metadata.created_by},
							{$pull:{models: `${req.params.collection}.${req.params.id}`}},
							function(err){
							if(err) throw err;

							res.redirect(`/admin/collections/${req.params.collection}`);
					   });
					});

				}else{
					res.locals.message = "Not allowed";
					res.json({
						status: "error",
						message: "Not allowed"
					});
				}
			});
		});
	}else{
		next();
	}
});

module.exports = router;