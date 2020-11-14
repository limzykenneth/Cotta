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
let limits = {
	fileSize: 0,
	acceptedMIME: []
};

const sanitizerAllowedTags = sanitizeHtml.defaults.allowedTags.concat(["h1", "h2", "u"]);

const AppCollections = new DynamicRecord({
	tableSlug: "_app_collections"
});

// Route: {root}/api/collections/...

// GET routes
// GET collection with slug
router.get("/:collectionSlug", async function(req, res, next){
	try{
		const Collection = new DynamicRecord({
			tableSlug: req.params.collectionSlug
		});
		const collection = await Collection.all();
		_.each(collection.data, (el) => {
			delete el._id;
		});

		const schema = await AppCollections.findBy({"_$id": req.params.collectionSlug});
		_.each(collection.data, (model) => {
			replaceModelFileURL(schema.data, model);
		});

		res.json(collection.data);
	}catch(err){
		next(err);
	}
});

// GET specific model from a collection
router.get("/:collectionSlug/:modelID", async function(req, res, next){
	try{
		const Collection = new DynamicRecord({
			tableSlug: req.params.collectionSlug
		});
		const model = await Collection.findBy({"_uid": parseInt(req.params.modelID)});
		if(model){
			delete model.data._id;

			// Populate file URLs with correct hostname
			const schema = await AppCollections.findBy({"_$id": req.params.collectionSlug});
			replaceModelFileURL(schema.data, model.data);

			res.json(model.data);
		}else{
			next(new CottaError("Model does not exist", `The requested model with ID ${req.params.modelID} does not exist.`, 404));
		}
	}catch(err){
		next(err);
	}
});


// POST routes
router.use(async function(req, res, next){
	limits = await configLimits(limits);
	next();
});

// POST to specific collection (create new model)
// Insert as is into database, just adding metadata and uid
router.post("/:collectionSlug", restrict.toAuthor, async function(req, res, next){
	try{
		const Collection = new DynamicRecord({
			tableSlug: req.params.collectionSlug
		});
		const schema = new DynamicRecord.DynamicSchema();
		const AppCollections = new DynamicRecord({
			tableSlug: "_app_collections"
		});

		const appCollection = await AppCollections.findBy({"_$id": req.params.collectionSlug});
		await schema.read(req.params.collectionSlug);
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
			throw new CottaError("Invalid Schema", `The provided fields does not match schema entry of ${req.params.collectionSlug} in the database`, 400);
		}else{
			// Schema matched continue processing
			const Files = new DynamicRecord({
				tableSlug: "files_upload"
			});

			const model = new Collection.Model(req.body);
			const filePromises = [];

			// Individual field's operation
			_.each(fields, (el, key) => {

				// File upload field found
				if(el.app_type == "file"){
					// Check if uploading multiple files
					if(Array.isArray(model.data[key])){
						for(const entry of model.data[key]){
							if(!_.includes(limits.acceptedMIME, entry["content-type"])){
								throw new CottaError("Invalid MIME type", `File type "${entry["content-type"]}" is not supported`, 415);
							}

							const file = new Files.Model(_.cloneDeep(entry));
							uploadUtils.processFileMetadata(file, req, limits);
							filePromises.push(file.save().then(() => {
								return uploadUtils.setFileEntryMetadata(entry, file, req, limits);
							}));
						}

					// Uploading a single file (Deprecated)
					}else{
						if(!_.includes(limits.acceptedMIME, model.data[key]["content-type"])){
							throw new CottaError("Invalid MIME type", `File type "${model.data[key]["content-type"]}" is not supported`, 415);
						}

						const file = new Files.Model(_.cloneDeep(model.data[key]));
						uploadUtils.processFileMetadata(file, req, limits);
						filePromises.push(file.save().then((m) => {
							return uploadUtils.setFileEntryMetadata(model.data[key], file, req, limits);
						}));
					}

				}else if(el.app_type == "wysiwyg"){
					// WYSIWYG field found
					// Sanitize HTML input
					model.data[key] = sanitizeHtml(model.data[key], {
						allowedTags: sanitizerAllowedTags
					});
				}
			});

			await Promise.all(filePromises);

			// Process data
			// Create metadata
			model.data._metadata = {
				created_by: req.user.username,
				date_created: moment.utc().format(),
				date_modified: moment.utc().format()
			};

			// Insert data
			await model.save();

			// PENDING: update user model to relfect ownership of model
			delete model.data._id;
			const appSchema = await AppCollections.findBy({"_$id": req.params.collectionSlug});
			replaceModelFileURL(appSchema.data, model.data);
			res.json(model.data);
		}
	}catch(err){
		next(err);
	}
});

// POST to specific model in a collection (edit existing model)
router.post("/:collectionSlug/:modelID", restrict.toAuthor, async function(req, res, next){
	try{
		const promises = [];
		if(req.user.role != "administrator" && req.user.role != "editor"){
			promises.push(ownModel(req.user.username, req.params.collectionSlug, req.params.modelID));
		}

		const data = req.body;

		const Collection = new DynamicRecord({
			tableSlug: req.params.collectionSlug
		});
		const Schema = new DynamicRecord.DynamicSchema();
		const AppCollections = new DynamicRecord({
			tableSlug: "_app_collections"
		});

		await Promise.all(promises);
		const appCollection = await AppCollections.findBy({"_$id": req.params.collectionSlug});

		await Schema.read(req.params.collectionSlug);
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
									throw new CottaError("Invalid MIME type", `File type "${file.data["content-type"]}" is not supported`, 415);
								}else{
									uploadUtils.processFileMetadata(file, req, limits);
									filePromises.push(
										file.save().then(() => {
											return uploadUtils.setFileEntryMetadata(entry, file, req, limits);
										})
									);
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
								throw new CottaError("Invalid MIME type", `File type "${file.data["content-type"]}" is not supported`, 415);
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

			await Promise.all(filePromises);
		}

		const model = await Collection.findBy({"_uid": parseInt(req.params.modelID)});
		if(model.data == null){
			res.json(model.data);
			throw new CottaError("Model not found", `Cannot edit model with ID: ${req.prarams.modelID}, model does not exist in the collection ${req.params.collectionSlug}`, 404);
		}

		// Set metadata
		model.data._metadata.date_modified = moment.utc().format();
		// Set new data into model
		for(let key in data){
			model.data[key] = data[key];
		}
		// Insert into database
		await model.save().catch((err) => {
			throw new CottaError("Invalid Schema", `The provided fields does not match schema entry of ${req.params.collectionSlug} in the database`, 400);
		});

		// Return with updated model
		const schema = await AppCollections.findBy({"_$id": req.params.collectionSlug});
		replaceModelFileURL(schema.data, model.data);

		res.json(model.data);

	}catch(err){
		next(err);
	}
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
router.delete("/:collectionSlug/:modelID", restrict.toAuthor, async function(req, res, next){
	try{
		const promises = [];
		if(req.user.role != "administrator" && req.user.role != "editor"){
			promises.push(ownModel(req.user.username, req.params.collectionSlug, req.params.modelID));
		}

		await Promise.all(promises);
		const Collection = new DynamicRecord({
			tableSlug: req.params.collectionSlug
		});

		const model = await Collection.findBy({"_uid": parseInt(req.params.modelID)});
		if(model !== null){
			const retModel = _.cloneDeep(model.data);
			await model.destroy();
			const schema = await AppCollections.findBy({"_$id": req.params.collectionSlug});
			replaceModelFileURL(schema.data, retModel);

			res.json(retModel);
		}else{
			throw new CottaError("Model does not exist", `The requested model with ID ${req.params.modelID} does not exist.`, 404);
		}
	}catch(err){
		next(err);
	}
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
async function ownModel(username, collectionSlug, modelID){
	const Collection = new DynamicRecord({
		tableSlug: collectionSlug
	});
	const user = await Collection.findBy({"username": username});
	if(!_.includes(user.models, `${collectionSlug}.${modelID}`)){
		return Promise.reject(new CottaError("Forbidden", "User not allowed to modify this resource", 403));
	}
}

// Refactored function to replace root url in file links
function replaceModelFileURL(schema, model){
	_.each(schema.fields, (field, slug) => {
		if(field.app_type === "file"){
			if(Array.isArray(model[slug])){
				_.each(model[slug], (entry) => {
					const t1 = _.template(entry.permalink);
					const t2 = _.template(entry.upload_link);
					entry.permalink = t1({root: process.env.ROOT_URL});
					entry.upload_link = t2({root: process.env.ROOT_URL});
				});
			}else{
				const t1 = _.template(model[slug].permalink);
				const t2 = _.template(model[slug].upload_link);
				model[slug].permalink = t1({root: process.env.ROOT_URL});
				model[slug].upload_link = t2({root: process.env.ROOT_URL});
			}
		}
	});
}