const bcrypt = require("bcrypt");
const MongoClient = require('mongodb').MongoClient;
const f = require("util").format;

let mongoURL = f("mongodb://%s:%s@%s/%s", process.env.mongo_user, process.env.mongo_pass, process.env.mongo_server, process.env.mongo_db_name);

var authenticate = function(name, pass, fn) {
	// If not called by another module
	if (!module.parent) console.log("authenticating %s:%s", name, pass);

	MongoClient.connect(mongoURL, function (err, db) {
		if (err) throw err;

		db.collection("users_auth").find({"username": name}).toArray(function (err, result) {
			if (err) throw err;
			if (result.length > 1) throw "More than one entries found, PANIC!";

			var hash = result[0].hash;

			bcrypt.compare(pass, hash, function(err, res) {
				if (err) return fn(err);
			    if(res === true){
			    	return fn(null, result);
			    }else{
				    fn(new Error("invalid password"));
				}
			});
		});

		db.close();
	});
};

module.exports = authenticate;