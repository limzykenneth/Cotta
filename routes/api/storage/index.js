let Storage;
let storage;

// Initial values for limits, to be overwritten by database entries
const limits = {
	fileSize: 0,
	acceptedMIME: []
};

if(process.env.STORAGE_STRATEGY === "fs"){
	Storage = require("./fs.js");
	storage = new Storage({
		fileDir: "./uploads/",
		limit: limits.fileSize
	});
}else if(process.env.STORAGE_STRATEGY === "mongodb"){
	Storage = require("./mongodb.js");
	storage = new Storage({
		uri: `mongodb://${process.env.mongo_user}:${process.env.mongo_pass}@${process.env.mongo_server}/${process.env.mongo_db_name}`,
		limit: limits.fileSize
	});
}

module.exports = storage;