const _ = require("lodash");
const express = require("express");
const router = express.Router();
const path = require("path");
const f = require("util").format;
const multer = require('multer');
const upload = multer({dest: "uploads/"});

let connect = require("../database.js");

function parseRequest(req, res, next){
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
	data.fields = [];
	let regName = /^name-(\d+)?$/;
	let regType = /^type-(\d+?)$/;
	_.each(req.body, function(el, key){
		let buffer = {};
		if(regName.test(key)){
			let index = key.replace(regName, "$1");
			buffer.properties = {};
			buffer.name = req.body["name-" + index];
			buffer.slug = buffer.name.toLowerCase().replace(" ", "_");
			buffer.type = req.body["type-" + index];
			if(buffer.type == "checkbox" || buffer.type == "radio"){
				let choices = req.body["option-" + index].split(/\r?\n/);
				let choiceObject = {};
				_.each(choices, function(el, i){
					var reg = [/^"(.+?)":"(.+?)"$/g, /^"(.+?)":(.+?)$/g, /^(.+?):"(.+?)"$/g, /^(.+?):(.+?)$/g];
					if(reg[0].test(el)){
						choiceObject[el.replace(reg[0], "$1")] = el.replace(reg[0], "$2");
					}else if(reg[1].test(el)){
						choiceObject[el.replace(reg[1], "$1")] = el.replace(reg[1], "$2");
					}else if(reg[2].test(el)){
						choiceObject[el.replace(reg[2], "$1")] = el.replace(reg[2], "$2");
					}else if(reg[3].test(el)){
						choiceObject[el.replace(reg[3], "$1")] = el.replace(reg[3], "$2");
					}else{
						choiceObject[el] = el;
					}
				});
				buffer.properties.choices = choiceObject;
			}
			data.fields.push(buffer);
		}
	});

	req.formData = data;
	next();

	// For debugging
	// console.log(JSON.stringify(data));
	// res.json({
	// 	status: "success"
	// });
}

router.post("/new", upload.none(), parseRequest, function(req, res){
	connect.then(function(db){
		db.collection("_schema").find({collectionSlug: req.formData.collectionSlug}).toArray(function(err, result){
			if(err) throw err;

			if(result.length > 0){
				res.json({
					status: "failed",
					reason: "Collection with that name already exist."
				});
			}else{
				db.collection("_schema").insertOne(req.formData, function(err){
					if(err) throw err;

					res.json({
						status: "success"
					});
				});
			}
		});
	});
});

router.post("/edit/:collection", upload.none(), parseRequest, function(req, res){
	connect.then(function(db){
		db.collection("_schema").updateOne({collectionSlug: req.formData.collectionSlug}, req.formData, null, function(err){
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