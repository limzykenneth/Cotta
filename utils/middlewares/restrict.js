var express = require("express");
var session = require("express-session");
var path = require("path");

var currentPath = "/admin";

var restrict = function(req, res, next){
	if (req.session.user) {
		next();
	} else {
		req.session.error = "Access denied!";
		res.redirect(path.join(currentPath + "/login"));
	}
};

module.exports = restrict;