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
	"engine": pjson.engine,
	"dependencies": pjson.dependencies,
	"devDependencies": {
		"nodemon": "^1.19.4"
	},
	"nodemonConfig": pjson.nodemonConfig,
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