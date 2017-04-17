const express = require("express");
const session = require("express-session");
const path = require("path");
const connect = require("../database.js");

// Middleware to make sure user is logged in
var restrict = function(req, res, next){
	if (req.session.user) {
		next();
	} else {
		req.session.error = "Please login to continue.";
		res.redirect("/admin/login");
	}
};

// Restrict route to administrators only
restrict.toAdministrator = function(req, res, next){
	connect.then(function(db){
		return db.collection("_users_auth").findOne({username: req.session.user.username});
	}).then(function(user){
		if(user.role == "administrator"){
			next();
		} else{
			res.status(403);
			res.json({
				status: "error",
				message: "Not allowed"
			});
		}
	}).catch(function(err){
		next(err);
	});
};

// Restrict route to administrators and editors only
restrict.toEditor = function(req, res, next){
	connect.then(function(db){
		return db.collection("_users_auth").findOne({username: req.session.user.username});
	}).then(function(user){
		if(user.role == "administrator" || user.role == "editor"){
			next();
		} else{
			res.status(403);
			res.json({
				status: "error",
				message: "Not allowed"
			});
		}
	}).catch(function(err){
		next(err);
	});
};

// Restrict route to administrators, editors and authors only
restrict.toAuthor = function(req, res, next){
	connect.then(function(db){
		return db.collection("_users_auth").findOne({username: req.session.user.username});
	}).then(function(user){
		if(user.role == "administrator" || user.role == "editor" || user.role == "author"){
			next();
		} else{
			res.status(403);
			res.json({
				status: "error",
				message: "Not allowed"
			});
		}
	}).catch(function(err){
		next(err);
	});
};

module.exports = restrict;