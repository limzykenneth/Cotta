// Main entry point for API routes
const _ = require("lodash");
const express = require("express");
const router = express.Router();
const auth = require("./auth.js");
const schema = require("./schema.js");
const users = require("./users.js");
const collections = require("./collections.js");
const account = require("./account.js");
const tokens = require("./tokens.js");
const signup = require("./signup.js");
// const upload = require("./upload/upload.js");

// Mount Token routes
router.use("/tokens", tokens);

// Mount Signup routes
router.use("/signup", signup);

// Authenticate all routes (auth.js determine if it's requried or not)
router.use(auth);

// Mount schema related routes
router.use("/schema", schema);

// Mount users related routes
router.use("/users", users);

// Mount collections related routes
router.use("/collections", collections);

// Mount account related routes
router.use("/account", account);

// Mount upload paths
// router.use("upload", upload);

// Default
router.use("/", function(req, res){
	res.json({
		message: "Welcome to API endpoint of this site."
	});
});

module.exports = router;