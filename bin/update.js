#!/usr/bin/env node

async function update(){
	console.log("\n🌱 Checking Cotta version...");

	const fetch = require("node-fetch");
	const semver = require("semver");
	const Bluebird = require("bluebird");
	const yauzl = Bluebird.promisifyAll(require("yauzl"));
	const fs = require("fs");
	const pjson = require("../package.json");
	const inquirer = require("inquirer");
	const _ = require("lodash");

	try{
		let confirm = await inquirer.prompt([{
			type: "confirm",
			name: "confirm",
			message: "Running the auto updater will overwrite all files that came with Cotta originally (including all routes files).\nAre you sure you want to continue?",
			prefix: "🌱",
			default: false
		}]);

		if(confirm){
			const info = await fetch("https://api.github.com/repos/limzykenneth/Cotta/releases/latest").then((res) => {
				return res.json();
			});

			const latestVersion = semver.clean(info.tag_name);

			let buf;
			if(semver.gt(latestVersion, pjson.cotta.version)){
				buf = await fetch(info.assets[0].browser_download_url).then((res) => {
					return res.buffer();
				});
			}else{
				throw new Error("No update required");
			}

			const zipFile = await yauzl.fromBufferAsync(buf, {lazyEntries: true});
			zipFile.readEntry();
			zipFile.on("entry", async (entry) => {
				const fileName = entry.fileName;
				if (/\/$/.test(entry.fileName)) {
					// Folder, skip
					zipFile.readEntry();
				}else if(entry.fileName === "package.json"){
					// Manage package.json updates without overwriting user's configs
					console.log(`🌱 Updating "${entry.fileName}"...`);
					const readStream = await zipFile.openReadStreamAsync(entry);

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

						zipFile.readEntry();

						fs.writeFile("./package.json", JSON.stringify(original, null, 2), "utf8", (err) => {
							if(err) throw err;

							zipFile.readEntry();
						});
					});

					readStream.on("data", (data) => {
						chunks = data;
					});
				}else if(entry.fileName === "README.md" || entry.fileName === "LICENSE.md"){
					// Files not to be updated, skip
					zipFile.readEntry();
				}else{
					// Overwriting the rest of the files
					console.log(`🌱 Writing file "${entry.fileName}"...`);
					const readStream = await zipFile.openReadStreamAsync(entry);

					readStream.on("end", () => {
						zipFile.readEntry();
					});

					readStream.pipe(fs.createWriteStream(fileName));
				}
			});
		}
	}catch(err){
		if(err.message === "No update required"){
			console.log("\n🌱 Cotta is already up to date.");
		}else{
			console.error(err);
			process.exit(1);
		}
	}
}

if(require.main === module){
	update();
}else{
	module.exports = update;
}