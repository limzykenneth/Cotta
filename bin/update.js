#!/usr/bin/env node

console.log("\n🌱 Checking Cotta version...");

const fetch = require("node-fetch");
const semver = require("semver");
const yauzl = require("yauzl");
const fs = require("fs");
const pjson = require("../package.json");
const inquirer = require("inquirer");
const _ = require("lodash");

inquirer.prompt([{
	type: "confirm",
	name: "confirm",
	message: "Running the auto updater will overwrite all files that came with Cotta originally (including all routes files).\nAre you sure you want to continue?",
	prefix: "🌱",
	default: false
}]).then((answers) => {
	if(answers.confirm){
		fetch("https://api.github.com/repos/limzykenneth/Cotta/releases/latest").then((res) => {
			return res.json();
		}).then((info) => {
			const latestVersion = semver.clean(info.tag_name);
			if(semver.gt(latestVersion, pjson.cotta.version)){
				return fetch(info.assets[0].browser_download_url);
			}
		}).then((res) => {
			return res.buffer();
		}).then((buf) => {
			yauzl.fromBuffer(buf, {lazyEntries: true}, (err, zipFile) => {
				if(err) return Promise.reject(err);

				zipFile.readEntry();
				zipFile.on("entry", (entry) => {
					const fileName = entry.fileName;
					if (/\/$/.test(entry.fileName)) {
						// Folder, skip
						zipFile.readEntry();
					}else if(entry.fileName === "package.json"){
						// Manage package.json updates without overwriting user's configs
						console.log(`🌱 Updating "${entry.fileName}"...`);
						zipFile.openReadStream(entry, (err, readStream) => {
							if (err) throw err;

							let chunks = null;
							readStream.on("end", () => {
								const original = _.cloneDeep(pjson);
								const pkg = JSON.parse(chunks.toString("utf8"));
								original.devDependencies = _.reduce(pkg.devDependencies, (acc, val, key) => {
									if(_.has(original.devDependencies, key)){
										if(semver.gt(semver.minVersion(val), semver.minVersion(original.devDependencies[key]))){
											acc[key] = val;
										}
									}else{
										acc[key] = val;
									}
									return acc;
								}, original.devDependencies);

								original.dependencies = _.reduce(pkg.dependencies, (acc, val, key) => {
									if(_.has(original.dependencies, key)){
										if(semver.gt(semver.minVersion(val), semver.minVersion(original.dependencies[key]))){
											acc[key] = val;
										}
									}else{
										acc[key] = val;
									}
									return acc;
								}, original.dependencies);

								original.cotta = pkg.cotta;

								fs.writeFile("./package.json", JSON.stringify(original, null, 2), "utf8", (err) => {
									if(err) throw err;

									zipFile.readEntry();
								});
							});

							readStream.on("data", (data) => {
								chunks = data;
							});
						});
					}else if(entry.fileName === "README.md" || entry.fileName === "LICENSE.md"){
						// Files not to be updated, skip
						zipFile.readEntry();
					}else{
						// Overwriting the rest of the files
						console.log(`🌱 Writing file "${entry.fileName}"...`);
						zipFile.openReadStream(entry, (err, readStream) => {
							if (err) throw err;

							readStream.on("end", () => {
								zipFile.readEntry();
							});

							readStream.pipe(fs.createWriteStream(fileName));
						});
					}
				});
			});
		}).catch((err) => {
			console.log(err);
		});
	}
});