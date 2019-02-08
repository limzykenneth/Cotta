// Main entry point for API uploading routes
require("dotenv").config();
const fs = require("fs");
const Promise = require("bluebird");
const path = require("path");
const _ = require("lodash");
const moment = require("moment");
const shortid = require("shortid");
const ActiveRecord = require("active-record");
const bodyParser = require("body-parser");

const express = require("express");
const router = express.Router();

const CharError = require("../../utils/charError.js");
const restrict = require("../../utils/middlewares/restrict.js");

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
	if(!_.includes(limits.acceptedMIME, req.body["content-type"])){
		return next(new CharError("Invalid MIME type", `File type "${req.body["content-type"]}" is not supported`, 415));
	}

	const file = new Files.Model(req.body);
	file.data.created_at = moment().format();
	file.data.modified_at = moment().format();
	file.data.file_owner = req.user.username;
	file.data.uploadExpire = moment().add(1, "hours").format();
	file.data.uploadLocation = shortid.generate();
	if(!file.data.file_size){
		file.data.file_size = limits.fileSize;
	}
	file.save().then(() => {
		res.json({
			location: `${req.protocol}://${req.get("host")}/api/upload/${file.data.uploadLocation}`,
			uploadExpire: file.data.uploadExpire,
			fileSizeLimit: limits.fileSize
		});
	});
});

router.post("/:location", restrict.toAuthor, bodyParser.raw({
	limit: limits.fileSize,
	type: limits.acceptedMIME
}), function(req, res, next){
	if(!_.includes(limits.acceptedMIME, req.headers["content-type"])){
		return next(new CharError("Invalid MIME type", `File type "${req.headers["content-type"]}" is not supported`, 415));
	}

	Files.findBy({uploadLocation: req.params.location}).then((file) => {
		if(file.data === null){
			next(new CharError("Invalid upload URL", "Upload URL is invalid", 400));
		}else if(file.data["content-type"] !== req.headers["content-type"]){
			next(new CharError("MIME Type Mismatch", `File type "${req.headers["content-type"]}" does not match metadata entry`, 400));
		}else if(moment(file.data.uploadExpire).isBefore(moment())){
			file.destroy();
			next(new CharError("Upload Link Expired", "This upload link has expired", 400));
		}else{
			// Set file name to be unique
			var fileNameArr = file.data.file_name.split(".");
			file.data.file_name = `${fileNameArr.shift()}-${shortid.generate()}.${fileNameArr.join("")}`;
			delete file.data.uploadExpire;
			delete file.data.uploadLocation;
			file.data.file_size = req.body.length;
			file.data.modified_at = moment().format();
			file.data.file_permalink = `${req.protocol}://${req.get("host")}/uploads/${file.data.file_name}`;

			// Save uploaded file
			fs.writeFile(path.join("./uploads/", file.data.file_name), req.body, (err) => {
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
});

module.exports = router;