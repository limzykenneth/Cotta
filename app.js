require("dotenv").config();
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const _ = require("lodash");
const cors = require("cors");
const morgan = require("morgan");

const logger = require("./logger.js");
const errors = require("./errors.js");

// const index = require("./routes/index");
const api = require("./routes/api/index.js");

// Express
const app = express();

app.use(morgan("dev", { "stream": logger.stream }));

app.use(cors());
// Parsers
app.use(function(req, res, next){
	if (req.headers.authorization && req.headers.authorization.split(" ")[0] === "Bearer") {
		req.token = req.headers.authorization.split(" ")[1];
	}
	next();
});
app.use(bodyParser.json());

// Mount root to /public where custom front end lives
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Mount dynamic routes
app.use("/api", api);



////////////
// Errors //
////////////
app.use(errors.notFound);
app.use(errors.general);


module.exports = app;