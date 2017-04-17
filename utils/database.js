const f = require("util").format;
const MongoClient = require('mongodb').MongoClient;

// Mongodb URL
let mongoURL = f("mongodb://%s:%s@%s/%s", process.env.mongo_user, process.env.mongo_pass, process.env.mongo_server, process.env.mongo_db_name);

// Utilize Promises to share the same connection for the whole app
let connection = MongoClient.connect(mongoURL, {poolSize: 10});

// For convenience so that schema and model can be returned at once
connection.getSchemaModel = function(collectionSlug, modelID){
	var returnObject = {};
	return connection.then(function(db){
		returnObject.db = db;
		return db.collection("_schema").findOne({collectionSlug: collectionSlug}).then(function(schema){
			returnObject.schema = schema;
			return Promise.resolve(db);
		});
	}).then(function(db){
		return db.collection(collectionSlug).findOne({"_uid": parseInt(modelID)}).then(function(model){
			returnObject.model = model;
			return Promise.resolve();
		});
	}).then(function(){
		return Promise.resolve(returnObject);
	});
};

module.exports = connection;