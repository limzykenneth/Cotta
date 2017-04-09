const _ = require("lodash");
const multer  = require('multer');
const path = require("path");
const connect = require("../database.js");
const randomstring = require("randomstring");

const uploadImage = multer({
	storage: multer.diskStorage({
		destination: function (req, file, cb) {
			cb(null, "./uploads/images");
		},
		filename: function (req, file, cb) {
			cb(null, path.basename(file.originalname, path.extname(file.originalname)) + '-' + randomstring.generate(10) + path.extname(file.originalname));
		}
	}),
	fileFilter: function(req, file, cb){
		var acceptedMIME = ["image/gif", "image/jpeg", "image/png"];
		if(_.includes(acceptedMIME, file.mimetype)){
			cb(null, true);
		}else{
			cb(null, false);
		}
	},
	limits: {
		fileSize: 20000000
	}
});

var uploadSchemas = function(req, res, next){
	connect.then(function(db){
		db.collection("_schema").findOne({collectionSlug: req.params.collection}, function(err, result){
			if(err) throw err;

			var fields = [];
			_.each(result.fields, function(el, i){
				if(el.type == "image"){
					fields.push({name: el.slug, maxCount: 1});
				}
			});
			if(fields.length !== 0){
				uploadImage.fields(fields)(req, res, next);
			}else{
				uploadImage.none()(req, res, next);
			}
		});
	});
};

module.exports = uploadSchemas;