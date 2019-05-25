require("dotenv").config();
const _ = require("lodash");
const express = require("express");
const moment = require("moment");
const jwt = require("jsonwebtoken");
const router = express.Router();
const Promise = require("bluebird");
const DynamicRecord = require("dynamic-record");
const nanoid = require("nanoid");
const path = require("path");

Promise.promisifyAll(jwt);
const restrict = require("../../utils/middlewares/restrict.js");
const CharError = require("../../utils/charError.js");
const uploadUtils = require("./uploadUtils.js");

const secret = process.env.JWT_SECRET;

// Configurations (hardcoded for now, should remove in the future)
const limits = {
	// Change to some integer value to limit file size
	fileSize: 1000000,
	acceptedMIME: [
		"audio/ogg",
		"image/jpeg"
	]
};

// Route: {root}/api/collections/...

// GET routes
// GET collection with slug
router.get("/:collectionSlug", function(req, res){
	const Collection = new DynamicRecord({
		tableSlug: req.params.collectionSlug
	});
	Collection.all().then((collection) => {
		res.json(collection.data);
	});
});

// GET specific model from a collection
router.get("/:collectionSlug/:modelID", function(req, res, next){
	const Collection = new DynamicRecord({
		tableSlug: req.params.collectionSlug
	});
	Collection.findBy({"_uid": parseInt(req.params.modelID)}).then((collection) => {
		if(collection){
			res.json(collection.data);
		}else{
			next(new CharError("Model does not exist", `The requested model with ID ${req.params.modelID} does not exist.`, 404));
		}
	});
});


// POST routes
// POST to specific collection (create new model)
// Insert as is into database, just adding metadata and uid
router.post("/:collectionSlug", restrict.toAuthor, function(req, res, next){
	const Collection = new DynamicRecord({
		tableSlug: req.params.collectionSlug
	});
	const schema = new DynamicRecord.DynamicSchema();
	const AppCollections = new DynamicRecord({
		tableSlug: "_app_collections"
	});

	let appCollection;
	AppCollections.findBy({"_$id": req.params.collectionSlug}).then((result) => {
		appCollection = result;
		return schema.read(req.params.collectionSlug);
	}).then(() => {
		const fields = appCollection.data.fields;
		const fieldsLength = _.size(appCollection.data.fields);
		let count = 0;

		// Comparing the schema with the provided data fields
		_.each(fields, (el, key) => {
			const slug = key;
			_.each(req.body, (el, i) => {
				if(slug === i){
					count++;
				}
			});
		});

		if(count !== fieldsLength){
			// Schema mismatched
			return Promise.reject(new CharError("Invalid Schema", `The provided fields does not match schema entry of ${req.params.collectionSlug} in the database`, 400));
		}else{
			// Schema matched continue processing
			const Files = new DynamicRecord({
				tableSlug: "files_upload"
			});

			const model = new Collection.Model(req.body);
			const filePromises = [];

			// Check for file upload field
			_.each(fields, function(el, key){

				// File upload field found
				if(el.app_type == "file"){
					// Check if uploading multiple files
					if(Array.isArray(model.data[key])){
						_.each(model.data[key], (entry) => {
							const file = new Files.Model(_.cloneDeep(entry));

							if(!_.includes(limits.acceptedMIME, file.data["content-type"])){
								next(new CharError("Invalid MIME type", `File type "${file.data["content-type"]}" is not supported`, 415));
								return false; // Exit _.each
							}else{
								uploadUtils.processFileMetadata(file, req);
								filePromises.push(file.save().then(() => {
									return uploadUtils.setFileEntryMetadata(entry, file, req);
								}));
							}
						});

					// Uploading a single file
					}else{
						const file = new Files.Model(_.cloneDeep(model.data[key]));

						if(!_.includes(limits.acceptedMIME, file.data["content-type"])){
							next(new CharError("Invalid MIME type", `File type "${file.data["content-type"]}" is not supported`, 415));
							return false;
						}else{
							uploadUtils.processFileMetadata(file, req);
							filePromises.push(file.save().then((m) => {
								return uploadUtils.setFileEntryMetadata(model.data[key], file, req);
							}));
						}
					}
				}
			});

			return Promise.all(filePromises).then((files) => {
				return Promise.resolve(model);
			});
		}
	}).then((model) => {
		// Process data
		// Create metadata
		model.data._metadata = {
			created_by: req.user.username,
			date_created: moment.utc().format(),
			date_modified: moment.utc().format()
		};

		// Insert data
		return model.save().then(() => {
			return Promise.resolve(model.data);
		});

		// PENDING: update user model to relfect ownership of model
		// 	// Update user schema
		// 	db.collection("_users_auth").updateOne({"username": req.user.username}, {
		// 		$addToSet:{
		// 			models: `${req.params.collectionSlug}.${data._uid}`
		// 		}
		// 	});
	}).then((data) => {
		res.json(data);
	}).catch((err) => {
		next(err);
	});
});

// POST to specific model in a collection (edit existing model)
router.post("/:collectionSlug/:modelID", restrict.toAuthor, function(req, res, next){
	const promises = [];
	if(req.user.role != "administrator" && req.user.role != "editor"){
		promises.push(ownModel(req.user.username, req.params.collectionSlug, req.params.modelID));
	}

	const data = req.body;

	const Collection = new DynamicRecord({
		tableSlug: req.params.collectionSlug
	});
	const schema = new DynamicRecord.DynamicSchema();
	const AppCollections = new DynamicRecord({
		tableSlug: "_app_collections"
	});

	Promise.all(promises).then(function(){
		let appCollection;
		AppCollections.findBy({"_$id": req.params.collectionSlug}).then((result) => {
			appCollection = result;
			return schema.read(req.params.collectionSlug);
		}).then(() => {
			const fields = appCollection.data.fields;
			const fieldsLength = _.size(appCollection.data.fields);
			let count = 0;

			// Comparing the schema with the provided data fields
			_.each(fields, (el, key) => {
				const slug = key;
				_.each(req.body, (el, i) => {
					if(slug === i){
						count++;
					}
				});
			});

			if(count !== fieldsLength){
				// Schema mismatched
				return Promise.reject(new CharError("Invalid Schema", `The provided fields does not match schema entry of ${req.params.collectionSlug} in the database`, 400));
			}else{
				// Schema matched continue processing
				const Files = new DynamicRecord({
					tableSlug: "files_upload"
				});

				const model = new Collection.Model(req.body);
				const filePromises = [];

				// Check for file upload field
				_.each(fields, function(el, key){

					// File upload field found
					if(el.type == "file"){

						// Check if uploading multiple files
						if(Array.isArray(model.data[key])){
							_.each(model.data[key], (entry) => {
								const file = new Files.Model(_.cloneDeep(entry));

								if(!_.includes(limits.acceptedMIME, file.data["content-type"])){
									next(new CharError("Invalid MIME type", `File type "${file.data["content-type"]}" is not supported`, 415));
									return false; // Exit _.each
								}else{
									uploadUtils.processFileMetadata(file, req);
									filePromises.push(file.save().then(() => {
										return uploadUtils.setFileEntryMetadata(entry, file, req);
									}));
								}
							});

						// Uploading a single file
						}else{
							const file = new Files.Model(_.cloneDeep(model.data[key]));

							if(!_.includes(limits.acceptedMIME, file.data["content-type"])){
								next(new CharError("Invalid MIME type", `File type "${file.data["content-type"]}" is not supported`, 415));
								return false;
							}else{
								uploadUtils.processFileMetadata(file, req);
								filePromises.push(file.save().then(() => {
									return uploadUtils.setFileEntryMetadata(model.data[key], file, req);
								}));
							}
						}
					}
				});

				return Promise.all(filePromises).then((files) => {
					return Promise.resolve(model);
				});
			}
		}).then(() => {
			Collection.findBy({"_uid": parseInt(req.params.modelID)}).then((model) => {
				if(model.data == null){
					res.json(model.data);
					return Promise.reject(new CharError("Model not found", `Cannot edit model with ID: ${req.prarams.modelID}, model does not exist in the collection ${req.params.collectionSlug}`, 404));
				}

				// Set metadata
				model.data._metadata.date_modified = moment.utc().format();
				// Set new data into model
				for(let key in data){
					model.data[key] = data[key];
				}
				// Insert into database
				return model.save();
			}).then((model) => {
				// Return with updated model
				res.json(model.data);
			});
		}).catch(function(err){
			next(err);
		});
	});
});


// DELETE routes
// DELETE all models in a collection
router.delete("/:collectionSlug", restrict.toAuthor, function(req, res){
	// Dangerous method
	res.json({
		message: "Implementation pending"
	});
});

// DELETE specific model in a collection
router.delete("/:collectionSlug/:modelID", restrict.toAuthor, function(req, res, next){
	const promises = [];
	if(req.user.role != "administrator" && req.user.role != "editor"){
		promises.push(ownModel(req.user.username, req.params.collectionSlug, req.params.modelID));
	}

	let data;
	Promise.all(promises).then(function(){
		const Collection = new DynamicRecord({
			tableSlug: req.params.collectionSlug
		});
		return Collection.findBy({"_uid": parseInt(req.params.modelID)});
	}).then((model) => {
		const retModel = _.cloneDeep(model.data);
		model.destroy().then((col) => {
			res.json(retModel);
		});
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
// Checks if the model belongs to the user, returns Promise
function ownModel(username, collectionSlug, modelID){
	const Collection = new DynamicRecord({
		tableSlug: collectionSlug
	});
	return Collection.findBy({"username": username}).then((user) => {
		if(_.includes(user.models, `${collectionSlug}.${modelID}`)){
			return Promise.resolve();
		}else{
			return Promise.reject(new CharError("Forbidden", "User not allowed to modify this resource", 403));
		}
	});
}