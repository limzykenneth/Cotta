require("dotenv").config();
const _ = require("lodash");
const express = require("express");
const moment = require("moment");
const jwt = require("jsonwebtoken");
const router = express.Router();
const Promise = require("bluebird");
const ActiveRecord = require("active-record");
const nanoid = require("nanoid");
const path = require("path");

Promise.promisifyAll(jwt);
const restrict = require("../../utils/middlewares/restrict.js");
const CharError = require("../../utils/charError.js");

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
	const Collection = new ActiveRecord({
		tableSlug: req.params.collectionSlug
	});
	Collection.all().then((collection) => {
		res.json(collection.data);
	});
});

// GET specific model from a collection
router.get("/:collectionSlug/:modelID", function(req, res){
	const Collection = new ActiveRecord({
		tableSlug: req.params.collectionSlug
	});
	Collection.findBy({"_uid": parseInt(req.params.modelID)}).then((collection) => {
		res.json(collection.data);
	});
});


// POST routes
// POST to specific collection (create new model)
// Insert as is into database, just adding metadata and uid
router.post("/:collectionSlug", restrict.toAuthor, function(req, res, next){
	const Collection = new ActiveRecord({
		tableSlug: req.params.collectionSlug
	});

	const schema = Collection.Schema;
	schema.read(req.params.collectionSlug).then(() => {
		const fields = schema.definition;
		const fieldsLength = schema.definition.length;
		let count = 0;
		// Comparing the schema with the provided data fields
		for(let i=0; i<fields.length; i++){
			const slug = fields[i].slug;
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
			const Files = new ActiveRecord({
				tableSlug: "files_upload"
			});

			const model = new Collection.Model(req.body);
			const filePromises = [];

			// Check for file upload field
			_.each(fields, function(el, i){

				// File upload field found
				if(el.type == "file"){

					// Check if uploading multiple files
					if(Array.isArray(model.data[el.slug])){
						_.each(model.data[el.slug], (entry) => {
							const file = new Files.Model(_.cloneDeep(entry));

							if(!_.includes(limits.acceptedMIME, file.data["content-type"])){
								next(new CharError("Invalid MIME type", `File type "${file.data["content-type"]}" is not supported`, 415));
								return false; // Exit _.each
							}else{
								processFileMetadata(file);
								filePromises.push(file.save().then(() => {
									// Model will save a reference to the uploaded file
									// The client will be responsible for uploading the file
									// so that the link saved in the model will work
									entry.uid = file.data.uid;
									entry.permalink = file.data.file_permalink;
									// File link will be write once only
									entry.upload_link = `${req.protocol}://${req.get("host")}/api/upload/${file.data.uid}`;
									entry.upload_expire = file.data.uploadExpire;
									return Promise.resolve(file);
								}));
							}
						});

					// Uploading a single file
					}else{
						const file = new Files.Model(_.cloneDeep(model.data[el.slug]));

						if(!_.includes(limits.acceptedMIME, file.data["content-type"])){
							next(new CharError("Invalid MIME type", `File type "${file.data["content-type"]}" is not supported`, 415));
							return false;
						}else{
							processFileMetadata(file);
							filePromises.push(file.save().then(() => {
								// Model will save a reference to the uploaded file
								// The client will be responsible for uploading the file
								// so that the link saved in the model will work
								model.data[el.slug].uid = file.data.uid;
								model.data[el.slug].permalink = file.data.file_permalink;
								// File link will be write once only
								model.data[el.slug].upload_link = `${req.protocol}://${req.get("host")}/api/upload/${file.data.uid}`;
								model.data[el.slug].upload_expire = file.data.uploadExpire;
								return Promise.resolve(file);
							}));
						}
					}
				}
			});

			return Promise.all(filePromises).then((files) => {
				return Promise.resolve(model);
			});
		}

		function processFileMetadata(file){
			file.data.created_at = moment().format();
			file.data.modified_at = moment().format();
			file.data.file_owner = req.user.username;
			file.data.uploadExpire = moment().add(1, "hours").format();
			file.data.uid = nanoid(20);
			const fileExt = path.extname(file.data.file_name) || "";
			file.data.file_permalink = `${req.protocol}://${req.get("host")}/uploads/${file.data.uid}${fileExt}`;
			file.data.saved_path = null;
			if(!file.data.file_size){
				file.data.file_size = limits.fileSize;
			}
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
	});
});

// POST to specific model in a collection (edit existing model)
router.post("/:collectionSlug/:modelID", restrict.toAuthor, function(req, res, next){
	const promises = [];
	if(req.user.role != "administrator" && req.user.role != "editor"){
		promises.push(ownModel(req.user.username, req.params.collectionSlug, req.params.modelID));
	}

	const data = req.body;

	Promise.all(promises).then(function(val){
		const Schema = new ActiveRecord({
			tableSlug: "_schema"
		});

		Schema.findBy({"collectionSlug": req.params.collectionSlug}).then((schema) => {
			// Check input against schema
			const fields = schema.data.fields;
			const slugs = fields.map(function(el){
				return el.slug;
			});
			const fieldsLength = fields.length;
			let valid = true;

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

			if(valid) {
				return Promise.resolve();
			}else{
				return Promise.reject(new CharError("Invalid Schema", `The provided fields does not match schema entry of ${req.params.collectionSlug} in the database`), 400);
			}
		}).then(() => {
			const Collection = new ActiveRecord({
				tableSlug: req.params.collectionSlug
			});
			Collection.findBy({"_uid": parseInt(req.params.modelID)}).then((model) => {
				// TO DO: Case where model don't exist
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
			}).then(() => {
				// Return with newly fetch model
				Collection.findBy({"_uid": parseInt(req.params.modelID)}).then((model) => {
					res.json(model.data);
				});
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
	Promise.all(promises).then(function(val){
		const Collection = new ActiveRecord({
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
function ownModel(username, collectionSlug, modelID){
	const Collection = new ActiveRecord({
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