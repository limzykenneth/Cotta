require("dotenv").config();
const express = require("express");
const socketIO = require("socket.io");
const path = require("path");
const favicon = require("serve-favicon");
const logger = require("morgan");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const _ = require("lodash");
const cors = require("cors");

const errors = require("./errors.js");

// const index = require("./routes/index");
const api = require("./routes/api/index.js");

// Express
let app = express();

// Socket.io
let io = socketIO();
app.io = io;

app.use(logger("dev"));

app.use(cors());
// Parsers
app.use(function(req, res, next){
	if (req.headers.authorization && req.headers.authorization.split(" ")[0] === "Bearer") {
	    req.token = req.headers.authorization.split(" ")[1];
	}
	next();
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Mount root to /public where custom front end lives
app.use(express.static(path.join(__dirname, "public")));

// WARN ----- Assets authentication should be considered
// Mount /uploads where uploaded images goes
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Mount dynamic routes
app.use("/api", api);



////////////
// Errors //
////////////
app.use(errors.notFound);
app.use(errors.general);


module.exports = app;