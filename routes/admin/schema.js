const _ = require("lodash");
const express = require("express");
const router = express.Router();
const path = require("path");
const f = require("util").format;
const MongoClient = require('mongodb').MongoClient;

let mongoURL = f("mongodb://%s:%s@%s/%s", process.env.mongo_user, process.env.mongo_pass, process.env.mongo_server, process.env.mongo_db_name);

router.post("/new", function(req, res){
	let data = req.body;
	if(!validateIncoming(data.collectionName)){
		res.json({
			status: "failed",
			reason: "Collection names should only contain alphanumeric characters, underscore and spaces."
		});
		return;
	}
	data.collectionSlug = data.collectionName.toLowerCase().replace(" ", "_");

	_.each(data.fields, function(el, i){
		if(!validateIncoming(el.name)){
			res.json({
				status: "failed",
				reason: "Field names should only contain alphanumeric characters, underscore and spaces."
			});
			return false;
		}
		el.slug = el.name.toLowerCase().replace(" ", "_");
	});

	MongoClient.connect(mongoURL, function(err, db){
		if(err) throw err;

		db.collection("_schema").find({collectionSlug: data.collectionSlug}).toArray(function(err, result){
			if(err) throw err;
			if(result.length > 0){
				res.json({
					status: "failed",
					reason: "Collection with that name already exist."
				});
				db.close();
			}else{
				db.collection("_schema").insertOne(data, function(err){
					if(err) throw err;

					res.json({
						status: "success"
					});
					db.close();
				});
			}
		});
	});
});

// Utils
function validateIncoming(string){
	let regexp = /^[a-zA-Z0-9-_ ]+$/;
	if (string.search(regexp) == -1){
		return false;
	}else{
		return true;
	}
}

module.exports = router;