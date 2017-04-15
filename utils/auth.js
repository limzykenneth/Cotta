const bcrypt = require("bcrypt");
const connect = require("./database.js");
const moment = require("moment");

let auth = {};

// Basic authentication
// Compares user password bcrypt hash
auth.authenticate = function(name, pass, fn) {
	connect.then(function(db){
		// Get user data
		db.collection("_users_auth").findOne({"username": name}, function(err, result){
			if (err) throw err;

			// No user found, return generic failed message
			if(!result){
				return fn(new Error("invalid password"));
			}

			// Compare password and hash
			bcrypt.compare(pass, result.hash, function(err, res) {
				if (err) return fn(err);

				// Success, call callback with first argument as null
				// second argument the user data sans password hash
			    if(res === true){
			    	delete result.hash;
			    	return fn(null, result);
			    // Fail, call callback with error object
			    }else{
				    fn(new Error("invalid password"));
				}
			});
		});
	});
};

// Sign up function
auth.signup = function(name, pass, fn){
	// Hash the password with bcrypt. Iterations might need to be adjusted
	bcrypt.hash(pass, 10, function(err, hash){
		if(err) throw err;

		connect.then(function(db){
			// Ensure username to be unique (to be tested)
			db.collection("_users_auth").createIndex({"username": 1}, {unique: true}, function(err){
				if(err) throw err;

				// Insert data of new user into database under _users_auth collection
				db.collection("_users_auth").insertOne({
					"username": name,
					"hash": hash,
					"role": "author",
					"date_created": moment.utc().format()
				}, function(err){
					if(err) return fn(err);

					return fn(null);
				});
			});
		});
	});
};

// Change password function with authentication built in
auth.changePassword = function(name, currentPassword, newPassword, fn){
	// Authenticate with the provided username and password
	this.authenticate(name, currentPassword, function(err, result){
		if(err) throw err;

		// Hash the new password
		bcrypt.hash(newPassword, 10, function(err, hash){
			connect.then(function(db){
				// Update the password hash with the new one
				db.collection("_users_auth").updateOne({"username": name}, {$set: {"hash": hash}}, function(err){
					if(err) {
						fn(err);
					}else{
						fn(null, result);
					}
				});
			});
		});
	});
};

module.exports = auth;