const bcrypt = require("bcrypt");
const moment = require("moment");
const ActiveRecord = require("active-record");

const Users = new ActiveRecord({
	tableSlug: "_users_auth"
});
const auth = {};

// Basic authentication
// Compares user password bcrypt hash
auth.authenticate = function(name, pass, fn) {
	Users.findBy({"username": name}).then((user) => {
		// No user found, return generic failed message
		if(!user){
			return fn(new Error("invalid password"));
		}

		// Compare password and hash
		bcrypt.compare(pass, user.data.hash, function(err, res) {
			if (err) return fn(err);

			// Success, call callback with first argument as null
			// second argument the user data sans password hash
			if(res === true){
				delete user.data.hash;
				return fn(null, user.data);
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
auth.signup = function(name, pass, role, fn){
	// Hash the password with bcrypt. Iterations might need to be adjusted
	bcrypt.hash(pass, 10, function(err, hash){
		if(err) return fn(new Error("Unexpected error occurred"));

		const user = new Users.Model({
			"username": name,
			"hash": hash,
			"role": role,
			"date_created": moment.utc().format()
		});
		user.save().then(() => {
			fn(null, user.data.username);
		}).catch(function(err){
			fn(err);
		});
	});
};

// Change password function with authentication built in (ROUTE NOT ACTIVE)
auth.changePassword = function(name, currentPassword, newPassword, fn){
	// Authenticate with the provided username and password
	auth.authenticate(name, currentPassword, function(err, result){
		if(err) fn(err);

		// Hash the new password
		bcrypt.hash(newPassword, 10, function(err, hash){
			Users.findBy({"username": name}).then((user) => {
				user.data.hash = hash;
				return user.save();
			}).then(() => {
				fn(null, result);
			}).catch(function(err){
				fn(err);
			});
		});
	});
};

module.exports = auth;