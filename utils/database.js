const f = require("util").format;
const MongoClient = require('mongodb').MongoClient;

// Mongodb URL
let mongoURL = f("mongodb://%s:%s@%s/%s", process.env.mongo_user, process.env.mongo_pass, process.env.mongo_server, process.env.mongo_db_name);

// Utilize Promises to share the same connection for the whole app
let connection = new Promise(function(resolve, reject){
	MongoClient.connect(mongoURL, {poolSize: 10}, function(err, db){
		if(err){
			reject(err);
		}else{
			resolve(db);
		}
	});
});

// Callback hell here for convenience so that schema and model can be returned at once
connection.getSchemaModel = function(collectionSlug, modelID){
	return new Promise(function(resolve, reject){
		connection.then(function(db){
			db.collection("_schema").findOne({collectionSlug: collectionSlug}, function(err, schema){
				if (err) {
					reject(err);
				}else{
					db.collection(collectionSlug).findOne({"_uid": parseInt(modelID)}, function(err, model){
						if(err){
							reject(err);
						}else{
							resolve({
								schema: schema,
								model: model,
								db: db
							});
						}
					});
				}
			});
		});
	});
};

module.exports = connection;