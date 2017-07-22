const _ = require("lodash");
const express = require("express");
const router = express.Router();
const connect = require("../../utils/database.js");

// Route: {root}/api/collections/...

// GET routes
// GET collection with slug
router.get("/:collectionSlug", function(req, res){
	connect.then(function(db){
		return db.collection(req.params.collectionSlug).find().toArray();
	}).then(function(data){
		res.json(data);
	});
});

// GET specific model from a collection
router.get("/:collectionSlug/:modelID", function(req, res){
	connect.then(function(db){
		return db.collection(req.params.collectionSlug).findOne({"_uid": parseInt(req.params.modelID)});
	}).then(function(data){
		res.json(data);
	});
});


// POST routes
// POST to specific collection (create new model)
router.post("/:collectionSlug", function(req, res){
	res.json({
		message: "Implementation pending"
	});
});

// POST to specific model in a collection (edit existing model)
router.post("/:collectionSlug/:modelID", function(req, res){
	res.json({
		message: "Implementation pending"
	});
});


// DELETE routes
// DELETE all models in a collection
router.delete("/:collectionSlug", function(req, res){
	res.json({
		message: "Implementation pending"
	});
});

// DELETE specific model in a collection
router.delete("/:collectionSlug/:modelID", function(req, res){
	res.json({
		message: "Implementation pending"
	});
});


// Default
router.use("/", function(req, res){
	res.json({
		message: "Invalid route"
	});
});

module.exports = router;