const bcrypt = require("bcrypt");
let connect = require("./database.js");

let auth = {};

auth.authenticate = function(name, pass, fn) {
	// If not called by another module
	if (!module.parent) console.log("authenticating %s:%s", name, pass);

	connect.then(function(db){
		db.collection("_users_auth").findOne({"username": name}, function(err, result){
			if (err) throw err;

			var hash = result.hash;

			bcrypt.compare(pass, hash, function(err, res) {
				if (err) return fn(err);
			    if(res === true){
			    	return fn(null, result);
			    }else{
				    fn(new Error("invalid password"));
				}
			});
		});
	});
};

auth.signup = function(name, pass, fn){
	bcrypt.hash(pass, 10, function(err, hash){
		if(err) throw err;

		connect.then(function(db){
			db.collection("_users_auth").createIndex({"username": 1}, {unique: true}, function(err){
				if(err) throw err;

				db.collection("_users_auth").insertOne({
					"username": name,
					"hash": hash
				}, function(err){
					if(err) return fn(err);

					return fn(null);
				});
			});
		});
	});
};

module.exports = auth;