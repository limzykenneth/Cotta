// Main entry point for API uploading routes
require("dotenv").config();
const Promise = require("bluebird");
const fs = Promise.promisifyAll(require("fs"));
const path = require("path");
const _ = require("lodash");
const moment = require("moment");
const DynamicRecord = require("dynamic-record");
const DynamicCollection = DynamicRecord.DynamicCollection;
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
fetch.Promise = Promise;

const express = require("express");
const router = express.Router();

const CottaError = require("../../utils/CottaError.js");
const restrict = require("../../utils/middlewares/restrict.js");
const uploadUtils = require("./uploadUtils.js");
const configLimits = require("../../utils/configLimits.js");

const storage = require("./storage");

const Files = new DynamicRecord({
	tableSlug: "files_upload"
});

let limits;
router.use(async function(req, res, next){
	limits = await configLimits();
	storage.limit = limits.fileSize;
	next();
});

// File metadata post path
router.post("/", restrict.toAuthor, function(req, res, next){
	// If given an array of images to process
	if(Array.isArray(req.body)){
		const fileCollection = new DynamicCollection(Files.Model, ...req.body);
		const promises = [];
		let err;

		// Iterate over each model in collection
		_.each(fileCollection, (file) => {
			if(!_.includes(limits.acceptedMIME, file.data["content-type"])){
				// Invalid file type
				err = new CottaError("Invalid MIME type", `File type "${file.data["content-type"]}" is not supported`, 415);
				// No need to process further, halt loop immediately
				return false;
			}else{
				// File type valid, populate metadata of model
				uploadUtils.processFileMetadata(file, req, limits);
			}
		});

		if(err){
			// Error found, return
			return next(err);
		}else{
			// Save all entries into database
			fileCollection.saveAll().then(() => {
				// Get an array with relevant upload data of the collection
				const reply = fileCollection.map((file) => {
					return {
						location: `${process.env.ROOT_URL}/api/upload/${file.data.uid}`,
						uploadExpire: file.data.uploadExpire
					};
				});
				res.json(reply);
			}).catch((err) => {
				next(err);
			});
		}

	// If given a single image to process
	}else{
		const file = new Files.Model(req.body);

		if(!_.includes(limits.acceptedMIME, file.data["content-type"])){
			// Invalid file type, return
			return next(new CottaError("Invalid MIME type", `File type "${file.data["content-type"]}" is not supported`, 415));
		}else{
			// File type valid, populate metadata of model
			uploadUtils.processFileMetadata(file, req, limits);
			// Save entry into database
			file.save().then(() => {
				res.json({
					location: `${process.env.ROOT_URL}/api/upload/${file.data.uid}`,
					uploadExpire: file.data.uploadExpire,
				});
			}).catch((err) => {
				next(err);
			});
		}
	}
});

// File upload path
router.post("/:location", restrict.toAuthor, function(req, res, next){
	if(req.headers["content-type"] === "application/json"){
		bodyParser.json()(req, res, next);
	}else{
		next();
	}
}, function(req, res, next){
	if(req.headers["content-type"] === "application/json"){
		// Upload with URL
		Files.findBy({uid: req.params.location}).then((file) => {
			// Do checks on the database entry
			if(file === null){
				return Promise.reject(new CottaError("Invalid upload URL", "Upload URL is invalid", 400));
			}else if(moment(file.data.uploadExpire).isBefore(moment())){
				file.destroy();
				return Promise.reject(new CottaError("Upload Link Expired", "This upload link has expired", 400));
			}else if(file.data.saved_path !== null){
				// File already exist
				return Promise.reject(new CottaError("Invalid upload URL", "Upload URL is invalid", 400));
			}else{
				// All tests passed
				return Promise.resolve(file);
			}
		}).then((file) => {
			// Fetch the file from remote URL
			return fetch(req.body.url).then((response) => {
				// Checks against fetched data
				const contentType = response.headers.get("content-type");
				if(!response.ok){
					return Promise.reject(new CottaError("Non-OK response code returned", `Request for resource at ${req.body.url} returned a non-OK response code.`, 400));
				}else if(file.data["content-type"] !== contentType){
					return Promise.reject(new CottaError("MIME Type Mismatch", `File type "${contentType}" does not match metadata entry`, 400));
				}

				// Set file path, and last modified timestamp
				setFileMetadata(file);

				// Save uploaded file
				return saveFileLocal(file.data, response.body).then((savedSize) => {
					// Update file size in database entry
					file.data.file_size = savedSize;
					// Save database entry of file
					return file.save();
				}).then(() => {
					const t = _.template(file.data.file_permalink);
					file.data.file_permalink = t({root: process.env.ROOT_URL});
					res.json({
						resource_path: file.data.file_permalink
					});
				});
			});
		}).catch((err) => {
			next(err);
		});

	}else{
		// Upload raw image
		if(!_.includes(limits.acceptedMIME, req.headers["content-type"])){
			return Promise.reject(new CottaError("Invalid MIME type", `File type "${req.headers["content-type"]}" is not supported`, 415));
		}

		return Files.findBy({uid: req.params.location}).then((file) => {
			if(file === null){
				return Promise.reject(new CottaError("Invalid upload URL", "Upload URL is invalid", 400));
			}else if(file.data["content-type"] !== req.headers["content-type"]){
				return Promise.reject(new CottaError("MIME Type Mismatch", `File type "${req.headers["content-type"]}" does not match metadata entry`, 400));
			}else if(moment(file.data.uploadExpire).isBefore(moment())){
				file.destroy();
				return Promise.reject(new CottaError("Upload Link Expired", "This upload link has expired", 400));
			}else if(file.data.saved_path !== null){
				// File already exist
				return Promise.reject(new CottaError("Invalid upload URL", "Upload URL is invalid", 400));

			}else{
				// Set file path, and last modified timestamp
				setFileMetadata(file);

				// Save uploaded file
				return saveFileLocal(file.data, req).then((savedSize) => {
					// Update file size in database entry
					file.data.file_size = savedSize;
					// Save database entry of file
					return file.save();
				}).then(() => {
					const t = _.template(file.data.file_permalink);
					file.data.file_permalink = t({root: process.env.ROOT_URL});
					res.json({
						resource_path: file.data.file_permalink
					});
				});
			}
		}).catch((err) => {
			next(err);
		});
	}
});

function saveFileLocal(fileMetadata, fileData){
	return storage.set(fileMetadata.saved_path, fileData, fileMetadata["content-type"]);
}

function setFileMetadata(file){
	const fileExt = path.extname(file.data.file_name) || "";
	file.data.saved_path = `${file.data.uid}`;
	file.data.modified_at = moment().format();
	delete file.data.uploadExpire;
}

module.exports = router;