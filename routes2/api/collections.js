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

router.get("/:collectionSlug/:modelID", function(req, res){
	connect.then(function(db){
		return db.collection(req.params.collectionSlug).findOne({"_uid": parseInt(req.params.modelID)});
	}).then(function(data){
		res.json(data);
	});
});

// Default
router.use("/", function(req, res){
	res.json({
		message: "Invalid route"
	});
});

module.exports = router;