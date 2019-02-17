// Main entry point for API uploading routes
require("dotenv").config();
require("any-promise/register/bluebird");
const fs = require("fs");
const Promise = require("bluebird");
const path = require("path");
const _ = require("lodash");
const moment = require("moment");
const ActiveRecord = require("active-record");
const bodyParser = require("body-parser");
const request = require("request");
const fetch = require('node-fetch');
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

router.get("/", restrict.toAuthor, function(req, res, next) {
	res.json({
		message: "Upload endpoint"
	});
});

router.post("/", restrict.toAuthor, function(req, res, next){
	// If given an array of images to process
	if(Array.isArray(req.body)){
		const fileCollection = new Files.Collection(Files.Model, ...req.body);
		const promises = [];
		let err;
		_.each(fileCollection, (file) => {
			if(!_.includes(limits.acceptedMIME, file.data["content-type"])){
				err = new CharError("Invalid MIME type", `File type "${file.data["content-type"]}" is not supported`, 415);
				return false;
			}else{
				uploadUtils.processFileMetadata(file, req);
			}
		});
		if(err){
			return next(err);
		}else{
			fileCollection.saveAll().then(() => {
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
			return next(new CharError("Invalid MIME type", `File type "${file.data["content-type"]}" is not supported`, 415));
		}else{
			uploadUtils.processFileMetadata(file, req);
			file.save().then(() => {
				res.json({
					location: `${req.protocol}://${req.get("host")}/api/upload/${file.data.uid}`,
					uploadExpire: file.data.uploadExpire,
				});
			});
		}
	}
});

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
		fetch(req.body.url)
			.then((response) => {
				const contentType = response.headers.get("content-type");
				if(!_.includes(limits.acceptedMIME, contentType)){
					next(new CharError("Invalid MIME type", `File type "${contentType}" is not supported`, 415));
				}else{
					return Files.findBy({uid: req.params.location}).then((file) => {
						if(file.data === null){
							next(new CharError("Invalid upload URL", "Upload URL is invalid", 400));
						}else if(file.data["content-type"] !== contentType){
							next(new CharError("MIME Type Mismatch", `File type "${response.headers["content-type"]}" does not match metadata entry`, 400));
						}else if(moment(file.data.uploadExpire).isBefore(moment())){
							file.destroy();
							next(new CharError("Upload Link Expired", "This upload link has expired", 400));
						}else if(file.data.saved_path !== null){
							// File already exist
							next(new CharError("Invalid upload URL", "Upload URL is invalid", 400));
						}else{
							// All tests passed
							return Promise.all([response.buffer(), file]);
						}
					});
				}
			}).then((data) => {
				const buf = data[0];
				const file = data[1];

				// Get file extension
				const fileExt = path.extname(file.data.file_name) || "";
				const savedName = `${file.data.uid}${fileExt}`;
				delete file.data.uploadExpire;
				delete file.data.uploadLocation;
				file.data.file_size = buf.length;
				file.data.modified_at = moment().format();
				file.data.saved_path = path.join("./uploads/", savedName);

				fs.writeFile(file.data.saved_path, buf, (err) => {
					if(err) return next(err);

					file.save().then(() => {
						res.json({
							resource_path: file.data.file_permalink
						});
					}).catch((err) => {
						next(err);
					});
				});
			});

	}else{
		// Upload raw image
		if(!_.includes(limits.acceptedMIME, req.headers["content-type"])){
			return next(new CharError("Invalid MIME type", `File type "${req.headers["content-type"]}" is not supported`, 415));
		}

		Files.findBy({uid: req.params.location}).then((file) => {
			if(file.data === null){
				next(new CharError("Invalid upload URL", "Upload URL is invalid", 400));
			}else if(file.data["content-type"] !== req.headers["content-type"]){
				next(new CharError("MIME Type Mismatch", `File type "${req.headers["content-type"]}" does not match metadata entry`, 400));
			}else if(moment(file.data.uploadExpire).isBefore(moment())){
				file.destroy();
				next(new CharError("Upload Link Expired", "This upload link has expired", 400));
			}else if(file.data.saved_path !== null){
				// File already exist
				next(new CharError("Invalid upload URL", "Upload URL is invalid", 400));

			}else{
				// Get file extension
				const fileExt = path.extname(file.data.file_name) || "";
				const savedName = `${file.data.uid}${fileExt}`;
				delete file.data.uploadExpire;
				delete file.data.uploadLocation;
				file.data.file_size = req.body.length;
				file.data.modified_at = moment().format();
				file.data.saved_path = path.join("./uploads/", savedName);

				// Save uploaded file
				fs.writeFile(file.data.saved_path, req.body, (err) => {
					if(err) return next(err);

					// Save database entry of file
					file.save().then(() => {
						res.json({
							resource_path: file.data.file_permalink
						});
					}).catch((err) => {
						next(err);
					});
				});
			}
		}).catch((err) => {
			next(err);
		});
	}
});

module.exports = router;