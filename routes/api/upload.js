// Main entry point for API uploading routes
require("dotenv").config();
const Promise = require("bluebird");
const fs = Promise.promisifyAll(require("fs"));
const path = require("path");
const _ = require("lodash");
const moment = require("moment");
const ActiveRecord = require("active-record");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
fetch.Promise = Promise;

const express = require("express");
const router = express.Router();

const CharError = require("../../utils/charError.js");
const restrict = require("../../utils/middlewares/restrict.js");
const uploadUtils = require("./uploadUtils.js");

// Configurations (hardcoded for now, should remove in the future)
const limits = {
	// Change to some integer value to limit file size
	fileSize: 1000000,
	acceptedMIME: [
		"audio/ogg",
		"image/jpeg"
	]
};

const Files = new ActiveRecord({
	tableSlug: "files_upload"
});

// File metadata post path
router.post("/", restrict.toAuthor, function(req, res, next){
	// If given an array of images to process
	if(Array.isArray(req.body)){
		const fileCollection = new Files.Collection(Files.Model, ...req.body);
		const promises = [];
		let err;

		// Iterate over each model in collection
		_.each(fileCollection, (file) => {
			if(!_.includes(limits.acceptedMIME, file.data["content-type"])){
				// Invalid file type
				err = new CharError("Invalid MIME type", `File type "${file.data["content-type"]}" is not supported`, 415);
				// No need to process further, halt loop immediately
				return false;
			}else{
				// File type valid, populate metadata of model
				uploadUtils.processFileMetadata(file, req);
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
						location: `${req.protocol}://${req.get("host")}/api/upload/${file.data.uploadLocation}`,
						uploadExpire: file.data.uploadExpire
					};
				});
				res.json(reply);
			});
		}

	// If given a single image to process
	}else{
		const file = new Files.Model(req.body);

		if(!_.includes(limits.acceptedMIME, file.data["content-type"])){
			// Invalid file type, return
			return next(new CharError("Invalid MIME type", `File type "${file.data["content-type"]}" is not supported`, 415));
		}else{
			// File type valid, populate metadata of model
			uploadUtils.processFileMetadata(file, req);
			// Save entry into database
			file.save().then(() => {
				res.json({
					location: `${req.protocol}://${req.get("host")}/api/upload/${file.data.uid}`,
					uploadExpire: file.data.uploadExpire,
				});
			});
		}
	}
});

// File upload path
router.post("/:location", restrict.toAuthor, function(req, res, next){
	if(req.headers["content-type"] === "application/json"){
		bodyParser.json()(req, res, next);
	}else{
		bodyParser.raw({
			limit: limits.fileSize,
			type: limits.acceptedMIME
		})(req, res, next);
	}
}, function(req, res, next){
	if(req.headers["content-type"] === "application/json"){
		// Upload with URL
		Files.findBy({uid: req.params.location}).then((file) => {
			// Do checks on the database entry
			if(file.data === null){
				return Promise.reject(new CharError("Invalid upload URL", "Upload URL is invalid", 400));
			}else if(moment(file.data.uploadExpire).isBefore(moment())){
				file.destroy();
				return Promise.reject(new CharError("Upload Link Expired", "This upload link has expired", 400));
			}else if(file.data.saved_path !== null){
				// File already exist
				return Promise.reject(new CharError("Invalid upload URL", "Upload URL is invalid", 400));
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
					return Promise.reject(new CharError("Non-OK response code returned", `Request for resource at ${req.body.url} returned a non-OK response code.`, 400));
				}else if(file.data["content-type"] !== contentType){
					return Promise.reject(new CharError("MIME Type Mismatch", `File type "${contentType}" does not match metadata entry`, 400));
				}
				return Promise.all([response.buffer(), file]);
			});
		}).then((data) => {
			const buf = data[0];
			const file = data[1];

			// Check length of data is within bounds
			if(buf.length > limits.fileSize){
				return Promise.reject(new CharError("File size too big", "The uploaded file is over the size limit acceptable.", 400));
			}

			// Set file size, file path, and last modified timestamp
			setFileMetadata(file, buf);

			// Save uploaded file
			return saveFileLocal(file.data, buf).then(() => {
				// Save database entry of file
				return file.save();
			}).then(() => {
				res.json({
					resource_path: file.data.file_permalink
				});
			});
		}).catch((err) => {
			next(err);
		});

	}else{
		// Upload raw image
		if(!_.includes(limits.acceptedMIME, req.headers["content-type"])){
			return Promise.reject(new CharError("Invalid MIME type", `File type "${req.headers["content-type"]}" is not supported`, 415));
		}

		return Files.findBy({uid: req.params.location}).then((file) => {
			if(file.data === null){
				return Promise.reject(new CharError("Invalid upload URL", "Upload URL is invalid", 400));
			}else if(file.data["content-type"] !== req.headers["content-type"]){
				return Promise.reject(new CharError("MIME Type Mismatch", `File type "${req.headers["content-type"]}" does not match metadata entry`, 400));
			}else if(moment(file.data.uploadExpire).isBefore(moment())){
				file.destroy();
				return Promise.reject(new CharError("Upload Link Expired", "This upload link has expired", 400));
			}else if(file.data.saved_path !== null){
				// File already exist
				return Promise.reject(new CharError("Invalid upload URL", "Upload URL is invalid", 400));

			}else{
				// Set file size, file path, and last modified timestamp
				setFileMetadata(file, req.body);

				// Save uploaded file
				return saveFileLocal(file.data, req.body).then(() => {
					// Save database entry of file
					return file.save();
				}).then(() => {
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
	return fs.writeFileAsync(fileMetadata.saved_path, fileData);
}

function setFileMetadata(file, buf){
	const fileExt = path.extname(file.data.file_name) || "";
	const savedName = `${file.data.uid}${fileExt}`;
	delete file.data.uploadExpire;
	delete file.data.uploadLocation;
	file.data.file_size = buf.length;
	file.data.modified_at = moment().format();
	file.data.saved_path = path.join("./uploads/", savedName);
}

module.exports = router;