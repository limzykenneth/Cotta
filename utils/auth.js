const bcrypt = require("bcrypt");
const moment = require("moment");
const Promise = require("bluebird");
const DynamicRecord = require("dynamic-record");
const CharError = require("./charError.js");

const Users = new DynamicRecord({
	tableSlug: "_users_auth"
});
const auth = {};

// Basic authentication
// Compares user password bcrypt hash
auth.authenticate = function(name, pass){
	let user;

	return Users.findBy({"username": name}).then((res) => {
		user = res;
		// No user found, return generic failed message
		if(!user){
			return Promise.reject(new CharError("Invalid login details", "The username or password provided is incorrect.", 403));
		}

		// Compare password and hash
		return bcrypt.compare(pass, user.data.hash);

	}).then((res) => {
		// Success return resolved promise with user data without hash
		if(res === true){
			delete user.data.hash;
			delete user._original.hash;
			return Promise.resolve(user);

		// Fail, call callback with error object
		}else{
			return Promise.reject(new CharError("Invalid login details", "The username or password provided is incorrect.", 403));
		}

	}).catch(function(err){
		return Promise.reject(err);
	});
};

// Sign up function
auth.signup = function(name, pass, role){
	// Hash the password with bcrypt. Iterations might need to be adjusted
	let user;
	return bcrypt.hash(pass, 10).then((hash) => {
		user = new Users.Model({
			"username": name,
			"hash": hash,
			"role": role,
			"date_created": moment.utc().format()
		});
		return user.save();
	}).then(() => {
		return Promise.resolve(user.data.username);
	}).catch((err) => {
		return Promise.reject(err);
	});
};

// Change password function with authentication built in
auth.changePassword = function(name, currentPassword, newPassword){
	// Authenticate with the provided username and password
	return auth.authenticate(name, currentPassword).then((user) => {
		// Hash the new password
		return bcrypt.hash(newPassword, 10);
	}).then((hash) => {
		return Users.findBy({"username": name}).then((user) => {
			user.data.hash = hash;
			return user.save();
		}).then(() => {
			return Promise.resolve();
		});
	}).catch((err) => {
		return Promise.reject(err);
	});
};

module.exports = auth;