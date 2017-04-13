/*
Really wanted to be able to mix file filter and fields
but doesn't seem to be possible.
*/
const _ = require("lodash");
const multer  = require('multer');
const path = require("path");
const connect = require("../database.js");
const randomstring = require("randomstring");

// Multer settings for image upload
// Use different Multer storage engine for saving to elsewhere
const uploadImage = multer({
	storage: multer.diskStorage({
		// Save uploaded images to ./uploads/images folder
		destination: function (req, file, cb) {
			cb(null, "./uploads/images");
		},
		// Save uploaded images with a random string appended to original filename
		// to prevent overwriting file with the same name
		filename: function (req, file, cb) {
			cb(null, path.basename(file.originalname, path.extname(file.originalname)) + '-' + randomstring.generate(10) + path.extname(file.originalname));
		}
	}),
	fileFilter: function(req, file, cb){
		// Only .gif, .jpg/.jpeg and .png images accepted
		var acceptedMIME = ["image/gif", "image/jpeg", "image/png"];
		if(_.includes(acceptedMIME, file.mimetype)){
			cb(null, true);
		}else{
			cb(null, false);
		}
	},
	limits: {
		// A file size limit of 2MB
		fileSize: 20000000
	}
});

// Middleware to handle multipart/form-data request
var uploadSchemas = function(req, res, next){
	connect.then(function(db){
		// Get the schema of the requested collection so we know how many upload fields there are
		db.collection("_schema").findOne({collectionSlug: req.params.collection}, function(err, result){
			if(err) throw err;

			// Populate array with fields with type "image"
			// Rethink required: Upload more than one image a field?
			var fields = [];
			_.each(result.fields, function(el, i){
				if(el.type == "image"){
					fields.push({name: el.slug, maxCount: 1});
				}
			});

			// Make sure there are something to process
			if(fields.length !== 0){
				uploadImage.fields(fields)(req, res, next);
			}else{
			// If not, just run the "none" middleware
				uploadImage.none()(req, res, next);
			}
		});
	});
};

module.exports = uploadSchemas;