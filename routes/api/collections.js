require("dotenv").config();
const _ = require("lodash");
const express = require("express");
const moment = require("moment");
const jwt = require("jsonwebtoken");
const router = express.Router();
const Promise = require("bluebird");
const ActiveRecord = require("active-record");
const autoIncrement = require("mongodb-autoincrement");

Promise.promisifyAll(jwt);
Promise.promisifyAll(autoIncrement);
const connect = require("../../utils/database.js");
const restrict = require("../../utils/middlewares/restrict.js");
const CharError = require("../../utils/charError.js");

const secret = process.env.JWT_SECRET;

// Route: {root}/api/collections/...

// GET routes
// GET collection with slug
router.get("/:collectionSlug", function(req, res){
	let Collection = new ActiveRecord(req.params.collectionSlug);
	Collection.all().then((collection) => {
		res.json(collection.data);
	});
});

// GET specific model from a collection
router.get("/:collectionSlug/:modelID", function(req, res){
	let Collection = new ActiveRecord(req.params.collectionSlug);
	Collection.findBy({"_uid": parseInt(req.params.modelID)}).then((collection) => {
		res.json(collection.data);
	});
});


// POST routes
// POST to specific collection (create new model)
// Insert as is into database, just adding metadata and uid
router.post("/:collectionSlug", restrict.toAuthor, function(req, res, next){
	let jwtData = {
		fields: []
	};

	// Check schema
	connect.then(function(db){
		return db.collection("_schema").findOne({"collectionSlug": req.params.collectionSlug})
			.then(function(data){
				var fields = data.fields;
				var fieldsLength = data.fields.length;
				var count = 0;

				// Comparing the schema with the provided data fields
				for(let i=0; i<fields.length; i++){
					let slug = fields[i].slug;
					_.each(req.body, function(el, i){
						if(slug === i){
							count++;
						}
					});
				}

				if(count !== fieldsLength){
					// Schema mismatched
					return Promise.reject(new CharError("Invalid Schema", `The provided fields does not match schema entry of ${req.params.collectionSlug} in the database`, 400));
				}else{
					// Schema matched continue processing
					// Check for file upload field
					_.each(fields, function(el, i){
						if(el.type == "files"){
							// Record the fields and also the data path intended(?)
							jwtData.fields.push({
								field: req.body[el.slug]
							});
						}
					});

					return Promise.resolve(db);
				}
			});

	}).then(function(db){

		// Process data

		let data = req.body;

		// Create metadata
		data._metadata = {
			created_by: req.user.username,
			date_created: moment.utc().format(),
			date_modified: moment.utc().format()
		};

		// Update user schema
		db.collection("_users_auth").updateOne({"username": req.user.username}, {
			$addToSet:{
				models: `${req.params.collectionSlug}.${data._uid}`
			}
		});

		// Set increment index (should be abstracted if RDBS is to be used)
		autoIncrement.setDefaults({collection: "_counters"});
		return autoIncrement.getNextSequenceAsync(db, req.params.collectionSlug).then(function(autoIndex){
			// Set unique auto incrementing index
			data._uid = autoIndex;
			return Promise.resolve(db);

		}).then(function(db){
			// Insert data into database
			return db.collection(req.params.collectionSlug).insertOne(data).then(function(){
				return Promise.resolve(data);
			});
		});
	}).then(function(data){
		// Data insertion successful
		if(jwtData.fields.length > 0){
			// There are file upload fields
			// Set the model ID
			jwtData.id = `${req.params.collectionSlug}.${data._uid}`;
			// jwt signature, limited to 1 hour for file upload
			jwt.signAsync(jwtData, secret, {
				expiresIn: "1h"
			}).then(function(token){
				res.set("X-Char-upload-token", token);
				res.json(data);
			});
		}else{
			// No upload fields so just continue
			res.json(data);
		}
	}).catch(function(err){
		next(err);
	});
});

// POST to specific model in a collection (edit existing model)
router.post("/:collectionSlug/:modelID", restrict.toAuthor, function(req, res, next){
	let promises = [connect];
	if(req.user.role != "administrator" && req.user.role != "editor"){
		promises.push(ownModel(req.user.username, req.params.collectionSlug, req.params.modelID));
	}

	let data = req.body;

	Promise.all(promises).then(function(val){
		db = val[0];

		return db.collection("_schema").findOne({"collectionSlug": req.params.collectionSlug}).then(function(schema){
			// Validate with schema
			var fields = schema.fields;
			var slugs = fields.map(function(el){
				return el.slug;
			});
			var fieldsLength = fields.length;
			var valid = true;

			_.each(req.body, function(el, key){
				if(!(_.includes(slugs, key))){
					res.status(400);
					res.json({
						"message": "Invalid Schema"
					});
					valid = false;
					return false;
				}
			});

			if(valid){
				return Promise.resolve(db);
			}else{
				return Promise.reject(new CharError("Invalid Schema", `The provided fields does not match schema entry of ${req.params.collectionSlug} in the database`), 400);
			}
		});

	}).then(function(db){
		// TO DO: Case where model don't exist
		// Set metadata
		return db.collection(req.params.collectionSlug).findOne({"_uid": parseInt(req.params.modelID)}).then(function(model){
			if(model == null){
				res.json(model);
				return Promise.reject(new CharError("Model not found", `Cannot edit model with ID: ${req.prarams.modelID}, model does not exist in the collection ${req.params.collectionSlug}`, 404));
			}
			data._metadata = model._metadata;
			data._metadata.date_modified = moment.utc().format();
			return Promise.resolve(db);
		});
	}).then(function(db){
		// Insert into database
		return db.collection(req.params.collectionSlug).updateOne({"_uid": parseInt(req.params.modelID)}, {$set: data}).then(function(){
			return Promise.resolve(db);
		});
	}).then(function(db){
		// Return updated model
		db.collection(req.params.collectionSlug).findOne({"_uid": parseInt(req.params.modelID)}).then(function(model){
			res.json(model);
		});
	}).catch(function(err){
		next(err);
	});
});


// DELETE routes
// DELETE all models in a collection
router.delete("/:collectionSlug", restrict.toAuthor, function(req, res){
	// connect.then(function(db){
	// 	return db.collection(req.params.collectionSlug).deleteMany({});
	// }).then(function(){
	// 	res.json({
	// 		message: "Deleted all"
	// 	});
	// });

	// Dangerous method
	res.json({
		message: "Implementation pending"
	});
});

// DELETE specific model in a collection
router.delete("/:collectionSlug/:modelID", restrict.toAuthor, function(req, res){
	let promises = [connect];
	if(req.user.role != "administrator" && req.user.role != "editor"){
		promises.push(ownModel(req.user.username, req.params.collectionSlug, req.params.modelID));
	}

	var data;
	Promise.all(promises).then(function(val){
		db = val[0];

		return db.collection(req.params.collectionSlug).findOne({"_uid": parseInt(req.params.modelID)}).then(function(model){
			data = model;
			return Promise.resolve(db);
		});
	}).then(function(db){
		return db.collection(req.params.collectionSlug).deleteOne({"_uid": parseInt(req.params.modelID)});
	}).then(function(){
		res.json(data);
	}).catch(function(err){
		next(err);
	});
});


// Default
router.use("/", function(req, res){
	res.json({
		message: "Invalid route"
	});
});

module.exports = router;


// Utils
function ownModel(username, collectionSlug, modelID){
	return connect.then(function(db){
		return db.collection("_users_auth").findOne({"username": username});
	}).then(function(user){
		if(_.includes(user.models, `${collectionSlug}.${modelID}`)){
			return Promise.resolve();
		}else{
			return Promise.reject(new CharError("Forbidden", "User not allowed to modify this resource", 403));
		}
	});
}