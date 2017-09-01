const express = require("express");
const session = require("express-session");
const path = require("path");
const connect = require("../database.js");

// Middleware to make sure user is logged in
var restrict = function(req, res, next){
	if (req.user) {
		next();
	} else {
		res.status(403);
		res.json({
			status: "error",
			message: "jwt must be provided"
		});
	}
};

// Restrict route to administrators only
restrict.toAdministrator = function(req, res, next){
	if(req.user.role == "administrator"){
		next();
	}else{
		res.status(403);
		res.json({
			status: "error",
			message: "User not allowed this resource"
		});
	}
};

// Restrict route to administrators and editors only
restrict.toEditor = function(req, res, next){
	if(req.user.role == "administrator" || req.user.role == "editor"){
		next();
	}else{
		res.status(403);
		res.json({
			status: "error",
			message: "User not allowed this resource"
		});
	}
};

// Restrict route to administrators, editors and authors only
restrict.toAuthor = function(req, res, next){
	if(req.user.role == "administrator" || req.user.role == "editor" || req.user.role == "author"){
		next();
	}else{
		res.status(403);
		res.json({
			status: "error",
			message: "User not allowed this resource"
		});
	}
};


module.exports = restrict;