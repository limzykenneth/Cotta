const express = require("express");
const session = require("express-session");
const path = require("path");
const connect = require("../database.js");

const currentPath = "/admin";

var restrict = function(req, res, next){
	if (req.session.user) {
		next();
	} else {
		req.session.error = "Please login to continue.";
		res.redirect(path.join(currentPath + "/login"));
	}
};

restrict.toAdministrator = function(req, res, next){
	connect.then(function(db){
		db.collection("_users_auth").findOne({username: req.session.user.username}, function(err, user){
			if(err) throw err;

			if(user.role == "administrator"){
				next();
			} else{
				res.locals.message = "Not allowed";
				res.json({
					status: "error",
					message: "Not allowed"
				});
			}
		});
	});
};

restrict.toEditor = function(req, res, next){
	connect.then(function(db){
		db.collection("_users_auth").findOne({username: req.session.user.username}, function(err, user){
			if(err) throw err;

			if(user.role == "administrator" || user.role == "editor"){
				next();
			} else{
				res.locals.message = "Not allowed";
				res.json({
					status: "error",
					message: "Not allowed"
				});
			}
		});
	});
};

restrict.toAuthor = function(req, res, next){
	connect.then(function(db){
		db.collection("_users_auth").findOne({username: req.session.user.username}, function(err, user){
			if(err) throw err;

			if(user.role == "administrator" || user.role == "editor" || user.role == "author"){
				next();
			} else{
				res.locals.message = "Not allowed";
				res.json({
					status: "error",
					message: "Not allowed"
				});
			}
		});
	});
};

module.exports = restrict;