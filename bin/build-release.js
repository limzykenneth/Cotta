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
		"nodemon": pjson.devDependencies.nodemon,
		"semver": pjson.devDependencies.semver,
		"yauzl": pjson.devDependencies.yauzl
	},
	"nodemonConfig": pjson.nodemonConfig,
	"cotta": {
		"version": pjson.version
	}
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
archive.directory("public/**/*", {
	ignore: ["./DS_Store"]
});
archive.glob("routes/**/*", {
	ignore: ["./DS_Store"]
});
archive.glob("schemas/**/*", {
	ignore: ["./DS_Store"]
});
archive.glob("utils/**/*", {
	ignore: ["./DS_Store"]
});
archive.file("app.js");
archive.file("errors.js");
archive.file("LICENSE.md", {name: "Cotta-LICENSE.md"});
archive.file("logger.js");
archive.append(JSON.stringify(templatePJSON, null, 2), {name: "package.json"});
archive.append(
	`# Untitled
### A Cotta project
	`
	, {name: "README.md"});

archive.finalize();