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
const uploadFile = multer({
	storage: multer.diskStorage({
		destination: function (req, file, cb) {
			cb(null, "./uploads/files");
		},
		filename: function (req, file, cb) {
			cb(null, path.basename(file.originalname, path.extname(file.originalname)) + '-' + randomstring.generate(10) + path.extname(file.originalname));
		}
	}),
	limits: {
		fileSize: 10000
	}
});

var uploadSchemas = generator(uploadImage);

function generator(){
	var multerSettings = Array.prototype.slice.call(arguments);
	var newFunctions = [];

	_.each(multerSettings, function(setting){
		var newFunction = function(req, res, next){
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
						setting.fields(fields)(req, res, next);
					}else{
						next();
					}
				});
			});
		};

		newFunctions.push(newFunction);
	});

	return newFunctions;
}

module.exports = uploadSchemas;