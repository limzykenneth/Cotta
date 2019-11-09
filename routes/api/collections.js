require("dotenv").config();
const _ = require("lodash");
const express = require("express");
const moment = require("moment");
const router = express.Router();
const Promise = require("bluebird");
const DynamicRecord = require("dynamic-record");
const sanitizeHtml = require("sanitize-html");

const restrict = require("../../utils/middlewares/restrict.js");
const CottaError = require("../../utils/CottaError.js");
const uploadUtils = require("./uploadUtils.js");
const configLimits = require("../../utils/configLimits.js");

// Initial values for limits, to be overwritten by database entries
const limits = {
	fileSize: 0,
	acceptedMIME: []
};

const sanitizerAllowedTags = sanitizeHtml.defaults.allowedTags.concat(["h1", "h2", "u"]);

// Route: {root}/api/collections/...

// GET routes
// GET collection with slug
router.get("/:collectionSlug", function(req, res, next){
	const Collection = new DynamicRecord({
		tableSlug: req.params.collectionSlug
	});
	Collection.all().then((collection) => {
		_.each(collection.data, (el) => {
			delete el._id;
		});
		res.json(collection.data);
	}).catch((err) => {
		next(err);
	});
});

// GET specific model from a collection
router.get("/:collectionSlug/:modelID", function(req, res, next){
	const Collection = new DynamicRecord({
		tableSlug: req.params.collectionSlug
	});
	Collection.findBy({"_uid": parseInt(req.params.modelID)}).then((collection) => {
		if(collection){
			delete collection.data._id;
			res.json(collection.data);
		}else{
			next(new CottaError("Model does not exist", `The requested model with ID ${req.params.modelID} does not exist.`, 404));
		}
	}).catch((err) => {
		next(err);
	});
});


// POST routes
router.use(async function(req, res, next){
	await configLimits(limits);
	next();
});

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
			return Promise.reject(new CottaError("Invalid Schema", `The provided fields does not match schema entry of ${req.params.collectionSlug} in the database`, 400));
		}else{
			// Schema matched continue processing
			const Files = new DynamicRecord({
				tableSlug: "files_upload"
			});

			const model = new Collection.Model(req.body);
			const filePromises = [];

			// Individual field's operation
			_.each(fields, function(el, key){

				// File upload field found
				if(el.app_type == "file"){
					// Check if uploading multiple files
					if(Array.isArray(model.data[key])){
						_.each(model.data[key], (entry) => {
							const file = new Files.Model(_.cloneDeep(entry));

							if(!_.includes(limits.acceptedMIME, file.data["content-type"])){
								next(new CottaError("Invalid MIME type", `File type "${file.data["content-type"]}" is not supported`, 415));
								return false; // Exit _.each
							}else{
								uploadUtils.processFileMetadata(file, req, limits);
								filePromises.push(file.save().then(() => {
									return uploadUtils.setFileEntryMetadata(entry, file, req, limits);
								}));
							}
						});

					// Uploading a single file
					}else{
						const file = new Files.Model(_.cloneDeep(model.data[key]));

						if(!_.includes(limits.acceptedMIME, file.data["content-type"])){
							next(new CottaError("Invalid MIME type", `File type "${file.data["content-type"]}" is not supported`, 415));
							return false;
						}else{
							uploadUtils.processFileMetadata(file, req, limits);
							filePromises.push(file.save().then((m) => {
								return uploadUtils.setFileEntryMetadata(model.data[key], file, req, limits);
							}));
						}
					}
				}

				// WYSIWYG field found
				if(el.app_type == "wysiwyg"){
					// Sanitize HTML input
					model.data[key] = sanitizeHtml(model.data[key], {
						allowedTags: sanitizerAllowedTags
					});
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
		delete data._id;
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
				return Promise.reject(new CottaError("Invalid Schema", `The provided fields does not match schema entry of ${req.params.collectionSlug} in the database`, 400));
			}else{
				// Schema matched continue processing
				const Files = new DynamicRecord({
					tableSlug: "files_upload"
				});

				const model = new Collection.Model(req.body);
				const filePromises = [];

				// Check for file upload field
				_.each(fields, function(el, key){
					if(el.app_type == "file"){
						// File upload field found

						if(Array.isArray(model.data[key])){
							// Uploading multiple files

							_.each(model.data[key], (entry) => {
								if(!entry.permalink){
									const file = new Files.Model(_.cloneDeep(entry));

									if(!_.includes(limits.acceptedMIME, file.data["content-type"])){
										next(new CottaError("Invalid MIME type", `File type "${file.data["content-type"]}" is not supported`, 415));
										return false; // Exit _.each
									}else{
										uploadUtils.processFileMetadata(file, req, limits);
										filePromises.push(file.save().then(() => {
											return uploadUtils.setFileEntryMetadata(entry, file, req, limits);
										}));
									}
								}
							});
						}else{
							// Uploading a single file

							// Check if incoming entries has `permalink` field
							if(!model.data[key].permalink){
								// Incoming file entry changed
								const file = new Files.Model(_.cloneDeep(model.data[key]));

								if(!_.includes(limits.acceptedMIME, file.data["content-type"])){
									next(new CottaError("Invalid MIME type", `File type "${file.data["content-type"]}" is not supported`, 415));
									return false;
								}else{
									uploadUtils.processFileMetadata(file, req, limits);
									filePromises.push(
										file.save().then(() => {
											return uploadUtils.setFileEntryMetadata(model.data[key], file, req, limits);
										})
									);
								}
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
					return Promise.reject(new CottaError("Model not found", `Cannot edit model with ID: ${req.prarams.modelID}, model does not exist in the collection ${req.params.collectionSlug}`, 404));
				}

				// Set metadata
				model.data._metadata.date_modified = moment.utc().format();
				// Set new data into model
				for(let key in data){
					model.data[key] = data[key];
				}
				// Insert into database
				return model.save().catch((err) => {
					return Promise.reject(new CottaError("Invalid Schema", `The provided fields does not match schema entry of ${req.params.collectionSlug} in the database`, 400));
				});
			}).then((model) => {
				// Return with updated model
				res.json(model.data);
			}).catch((err) => {
				next(err);
			});
		});
	}).catch((err) => {
		next(err);
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
	Promise.all(promises).then(() => {
		const Collection = new DynamicRecord({
			tableSlug: req.params.collectionSlug
		});
		return Collection.findBy({"_uid": parseInt(req.params.modelID)});
	}).then((model) => {
		if(model !== null){
			const retModel = _.cloneDeep(model.data);
			model.destroy().then((col) => {
				res.json(retModel);
			});
		}else{
			return next(new CottaError("Model does not exist", `The requested model with ID ${req.params.modelID} does not exist.`, 404));
		}
	}).catch((err) => {
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
			return Promise.reject(new CottaError("Forbidden", "User not allowed to modify this resource", 403));
		}
	});
}