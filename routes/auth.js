const bcrypt = require("bcrypt");

let connect = require("./database.js");

var authenticate = function(name, pass, fn) {
	// If not called by another module
	if (!module.parent) console.log("authenticating %s:%s", name, pass);

	connect.then(function(db){
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
	});
};

module.exports = authenticate;