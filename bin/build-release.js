#!/usr/bin/env node

const fs = require("fs");
const archiver = require("archiver");
const path = require("path");
const pjson = require("../package.json");

const output = fs.createWriteStream(path.join("releases", `cotta-${pjson.version}.zip`));
const archive = archiver("zip", {
	zlib: { level: 9 } // Sets the compression level.
});

const templatePJSON = {
	"name": "untitled",
	"version": "0.0.1",
	"private": true,
	"scripts": {
		"start": "node ./bin/www",
		"server": "nodemon ./bin/www"
	},
	"dependencies": {
		"bcrypt": "^3.0.6",
		"bluebird": "^3.7.1",
		"body-parser": "^1.19.0",
		"cors": "^2.8.5",
		"debug": "^4.1.1",
		"dotenv": "^4.0.0",
		"dynamic-record": "^0.5.2",
		"express": "^4.17.1",
		"inquirer": "^7.0.0",
		"jsonwebtoken": "^8.5.1",
		"lodash": "^4.17.15",
		"mkdirp": "^0.5.1",
		"moment": "^2.24.0",
		"mongodb": "^3.3.3",
		"morgan": "^1.9.1",
		"nanoid": "^2.1.6",
		"node-fetch": "^2.6.0",
		"sanitize-html": "^1.20.1",
		"winston": "^3.2.1"
	},
	"devDependencies": {
		"nodemon": "^1.19.4"
	},
	"nodemonConfig": {
		"ignore": [
			"public/**/*"
		]
	},
};

archive.on("warning", function(err) {
	if (err.code === "ENOENT") {
		console.log(err);
	} else {
		throw err;
	}
});

archive.on("error", function(err) {
	throw err;
});

archive.pipe(output);

archive.file("bin/www", {name: "bin/www"});
archive.file("bin/install.js", {name: "bin/install.js"});
archive.directory("public/", "public");
archive.directory("routes/", "routes");
archive.directory("schemas/", "schemas");
archive.directory("utils/", "utils");
archive.file("app.js");
archive.file("errors.js");
archive.file("LICENSE.md");
archive.file("logger.js");
archive.append(JSON.stringify(templatePJSON), {name: "package.json"});
archive.file("README.md");

archive.finalize();