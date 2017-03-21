const f = require("util").format;
const MongoClient = require('mongodb').MongoClient;

let mongoURL = f("mongodb://%s:%s@%s/%s", process.env.mongo_user, process.env.mongo_pass, process.env.mongo_server, process.env.mongo_db_name);

let connection = new Promise(function(resolve, reject){
	MongoClient.connect(mongoURL, {poolSize: 10}, function(err, db){
		if(err){
			reject(err);
		}else{
			resolve(db);
		}
	});
});

module.exports = connection;