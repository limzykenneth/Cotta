const bcrypt = require("bcrypt");
const connect = require("./database.js");
const moment = require("moment");

let auth = {};

// Basic authentication
// Compares user password bcrypt hash
auth.authenticate = function(name, pass, fn) {
	connect.then(function(db){
		// Get user data
		return db.collection("_users_auth").findOne({"username": name});
	}).then(function(result){
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
	}).catch(function(err){
		fn(new Error("Unexpected error occurred"));
	});
};

// Sign up function
auth.signup = function(name, pass, fn){
	// Hash the password with bcrypt. Iterations might need to be adjusted
	bcrypt.hash(pass, 10, function(err, hash){
		if(err) return fn(new Error("Unexpected error occurred"));

		connect.then(function(db){
			// Ensure username to be unique (to be tested)
			return db.collection("_users_auth").createIndex({"username": 1}, {unique: true}).then(function(){
				return Promise.resolve(db);
			});
		}).then(function(db){
			// Insert data of new user into database under _users_auth collection
			return db.collection("_users_auth").insertOne({
				"username": name,
				"hash": hash,
				"role": "author",
				"date_created": moment.utc().format()
			});
		}).then(function(){
			fn(null);
		}).catch(function(err){
			fn(err);
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
				return db.collection("_users_auth").updateOne({"username": name}, {$set: {"hash": hash}});
			}).then(function(){
				fn(null, result);
			}).catch(function(err){
				fn(err);
			});
		});
	});
};

module.exports = auth;