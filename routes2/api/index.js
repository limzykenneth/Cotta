// Main entry point for API routes
const _ = require("lodash");
const express = require("express");
const router = express.Router();
const session = require("express-session");
const connect = require("../../utils/database.js");
const auth = require("./auth.js");
const schema = require("./schema.js");
const users = require("./users.js");
const collections = require("./collections.js");

// Authenticate all routes (auth.js determine if it's requried or not)
router.use(auth);

// Mount schema related routes
router.use("/schema", schema);

// Mount users related routes
router.use("/users", users);

// Mount collections related routes
router.use("/collections", collections);

// Default
router.use("/", function(req, res){
	res.json({
		message: "Welcome to API endpoint of this site."
	});
});

module.exports = router;