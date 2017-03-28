const _ = require("lodash");
const express = require("express");
const router = express.Router();
const path = require("path");
const f = require("util").format;
const multer = require('multer');
const upload = multer({dest: "uploads/"});

let connect = require("../database.js");

router.post("/new", upload.none(), function(req, res){
	let data = {};
	data.collectionName = req.body["collection-name"];
	if(!validateIncoming(data.collectionName)){
		res.json({
			status: "failed",
			reason: "Collection names should start with alphanumeric characters and contain only alphanumeric characters, underscores and spaces."
		});
		return;
	}
	data.collectionSlug = data.collectionName.toLowerCase().replace(" ", "_");
	data.exposeToAPI = req.body["expose-to-api"] ? true : false;

	delete req.body["collection-name"];
	delete req.body["expose-to-api"];

	// Form fields data into key value pairs
	data.fields = {};
	let regName = /^name-(\d+)?$/;
	let regType = /^type-(\d+?)$/;
	_.each(req.body, function(el, key){
		if(regName.test(key)){
			let index = key.replace(regName, "$1");
			data.fields[el] = req.body["type-" + index];
		}
	});

	// For debugging
	// res.json({
	// 	status: "success"
	// });

	connect.then(function(db){
		db.collection("_schema").find({collectionSlug: data.collectionSlug}).toArray(function(err, result){
			if(err) throw err;

			if(result.length > 0){
				res.json({
					status: "failed",
					reason: "Collection with that name already exist."
				});
			}else{
				db.collection("_schema").insertOne(data, function(err){
					if(err) throw err;

					res.json({
						status: "success"
					});
				});
			}
		});
	});
});

router.post("/edit/:collection", upload.none(), function(req, res){
	let data = {};
	data.collectionName = req.body["collection-name"];
	if(!validateIncoming(data.collectionName)){
		res.json({
			status: "failed",
			reason: "Collection names should only contain alphanumeric characters, underscore and spaces."
		});
		return;
	}
	data.collectionSlug = data.collectionName.toLowerCase().replace(" ", "_");
	data.exposeToAPI = req.body["expose-to-api"] ? true : false;

	delete req.body["collection-name"];
	delete req.body["expose-to-api"];

	// Form fields data into key value pairs
	data.fields = {};
	let regName = /^name-(\d+)?$/;
	let regType = /^type-(\d+?)$/;
	_.each(req.body, function(el, key){
		if(regName.test(key)){
			let index = key.replace(regName, "$1");
			data.fields[el] = req.body["type-" + index];
		}
	});

	// For debugging
	// res.json({
	// 	status: "success"
	// });

	connect.then(function(db){
		db.collection("_schema").updateOne({collectionSlug: data.collectionSlug}, data, null, function(err){
			if(err) throw err;

			res.json({
				status: "success"
			});
		});
	});
});

// Utils
function validateIncoming(string){
	let regexp = /^[a-zA-Z0-9-_ ]+$/;
	if (string.search(regexp) == -1 || string.substr(0, 1) == "_"){
		return false;
	}else{
		return true;
	}
}

module.exports = router;