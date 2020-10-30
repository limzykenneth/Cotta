const express = require("express");
const router = express.Router();
const CottaError = require("../../../utils/CottaError.js");
const Strategies = {
	mongodb: require("./mongodb.js")
};
const DynamicRecord = require("dynamic-record");
const Config = new DynamicRecord({tableSlug: "_configurations"});

module.exports = async function(strategy){
	const fileSize = await Config.findBy({config_name: "upload_file_size_max"});

	let storage;
	if(strategy === "mongodb"){
		storage = new Strategies.mongodb({
			uri: process.env.database_host,
			limit: fileSize
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