const _ = require("lodash");
const express = require("express");
const router = express.Router();
const path = require("path");
const multerNone = require('multer')().none();
const connect = require("../../utils/database.js");
const restricted = require("../../utils/middlewares/restrict.js");

// Schema edits are allowed for editors and administrators only
router.use(restricted.toEditor);

// Delete specified collection
router.post("/delete/:collection", function(req, res, next){
	connect.then(function(db){
		// Rethink required: model list under users need to be cleaned as well
		var deletion = [];
		deletion.push(db.collection("_schema").deleteOne({collectionSlug: req.params.collection}));
		deletion.push(db.collection(req.params.collection).drop());
		deletion.push(db.collection("_counters").deleteOne({"_id": req.params.collection}));

		return Promise.all(deletion);
	}).then(function(){
		res.redirect("/admin/collections");
	}).catch(function(err){
		// If collection doesn't exist (no model created under the collection)
		if(err.errmsg == "ns not found") {
			res.redirect("/admin/collections");
		}else{
			next(err);
		}
	});
});

// Pasrse incoming data for following routes
router.use(multerNone, parseRequest);

// Create new collection
router.post("/new", function(req, res, next){
	connect.then(function(db){
		// Find collection with duplicate slug, if found, reject the new one
		var schemas = res.locals.schemas;
		var result = _.filter(schemas, {collectionSlug: req.params.collectionSlug});

		if(result.length > 0){
			res.status(409);
			res.json({
				status: "failed",
				message: "Collection with that name already exist."
			});
		}else{
			return Promise.resolve(db);
		}
	}).then(function(db){
		// Insert form data as is, should be parsed perfectly beforehand
		return db.collection("_schema").insertOne(req.formData);
	}).then(function(db){
		res.json({
			status: "success"
		});
	}).catch(function(err){
		next(err);
	});
});

// Edit specified collection's schema
router.post("/edit/:collection", function(req, res, next){
	connect.then(function(db){
		return db.collection("_schema").updateOne({collectionSlug: req.formData.collectionSlug}, req.formData);
	}).then(function(){
		res.json({
			status: "success"
		});
	}).catch(function(err){
		next(err);
	});
});

module.exports = router;

// Utils
function validateIncoming(string){
	let regexp = /^[a-zA-Z0-9-_ ]+$/;
	if (string.search(regexp) == -1 || string.substr(0, 1) == "_"){
		return false;
	}else{
		return true;
	}
}


// Shared middlewares
function parseRequest(req, res, next){
	let data = {};
	data.collectionName = req.body["collection-name"];

	if(!validateIncoming(data.collectionName)){
		res.json({
			status: "failed",
			message: "Collection names should start with alphanumeric characters and contain only alphanumeric characters, underscores and spaces."
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

	// req.body should only contain field info now
	_.each(req.body, function(el, key){
		let buffer = {};

		if(regName.test(key)){
			let index = key.replace(regName, "$1");
			buffer.properties = {};
			buffer.name = req.body["name-" + index];
			buffer.slug = buffer.name.toLowerCase().replace(" ", "_");
			buffer.type = req.body["type-" + index];

			// Checkbox and radio box require extra parsing
			if(buffer.type == "checkbox" || buffer.type == "radio"){
				// Split choices onto array by new lines
				let choices = req.body["option-" + index].split(/\r?\n/);
				let choiceObject = {};

				// Individual choices can be in the form:
				// choice
				// choice:value
				// "choice":value
				// choice:"value"
				// "choice":"value"
				// (Detected in reverse order to the list above)
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

				// Store parsed choices into buffer object
				buffer.properties.choices = choiceObject;
			}
			data.fields.push(buffer);
		}
	});

	// Store parsed form data into request object to be passed onto the next middleware
	req.formData = data;
	next();

	// For debugging
	// console.log(JSON.stringify(data));
	// res.json({
	// 	status: "success"
	// });
}