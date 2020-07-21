const express = require("express");
const router = express.Router();
const CottaError = require("../../../utils/CottaError.js");
const Strategies = {
	mongodb: require("./mongodb.js")
};

// Configurations (hardcoded for now, should remove in the future)
const limits = {
	// Change to some integer value to limit file size
	fileSize: 1000000,
	acceptedMIME: [
		"audio/ogg",
		"image/jpeg"
	]
};

module.exports = function(strategy){
	let storage;
	if(strategy === "mongodb"){
		storage = new Strategies.mongodb({
			uri: process.env.database_host,
			limit: limits.fileSize
		});
	}

	router.get("/:id", function(req, res, next){
		if(storage){
			const promises = [
				storage.length(req.params.id),
				storage.contentType(req.params.id)
			];
			Promise.all(promises).then(([length, contentType]) => {
				res.set("Cache-Control", "public, max-age=0");
				res.set("Content-Type", contentType);
				res.set("Content-Length", length);
				storage.getStream(req.params.id).pipe(res);
			});
		}else{
			next(new CottaError("Storage strategy undefined", `Storage strategy "${strategy}" is not defined.`, 500));
		}
	});

	return router;
};