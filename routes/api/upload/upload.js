// Main entry point for API uploading routes
require('dotenv').config();
const path = require("path");
const _ = require("lodash");
const express = require("express");
const router = express.Router();
const moment = require("moment");
const multer  = require('multer');
const randomstring = require("randomstring");
const Promise = require("bluebird");
const jwt = require('jsonwebtoken');
Promise.promisifyAll(jwt);
const connect = require("../../../utils/database.js");
const restrict = require("../../../utils/middlewares/restrict.js");
const CharError = require("../../../utils/charError.js");

const secret = process.env.JWT_SECRET;

const storage = multer.diskStorage({
	destination: path.join("uploads", moment.utc().format("YYYY/M/D")),

	filename: function(req, file, cb){
		// Note: Find out if originalname has extension, if so split with path
		// otherwise, use mime-types module from NPM
		let name = file.originalname + randomstring.generate(7);
		cb(null, name);
	}
});
const limits = {
	// Change to some integer value to limit file size
	fileSize: Infinity
};
const upload = multer({storage: storage, limits: limits});

router.post("/(:path)", restrict.toAuthor, upload.fields([{name: "files"}]), function(req, res, next){
	jwt.verifyAsync(req.get("X-Char-upload-token"), secret).then(function(payload){
		let associatedModel = {
			collectionSlug: payload.id.split(".")[0],
			collectionID: payload.id.split(".")[1]
		};

		_.each(req.files.files, function(file, i){

		});

		// Populate the newly created models with the URL of the uploaded files
		connect.then(function(db){
			db.collection(associatedModel.collectionSlug).findOne({"_uid": associatedModel.collectionID}).then(function(data){
				_.each(data, function(el, i){
					if(el == req.params.path){

					}
				});
			});
		});
	});
});

module.exports = router;