// Mostly copied from Firefox Send
// https://github.com/mozilla/send/blob/master/server/storage/fs.js
// Uses local file system for storing uploaded files
const fs = require("fs");
const path = require("path");
const promisify = require("util").promisify;
const mkdirp = require("mkdirp");
const CottaError = require("../../../utils/CottaError.js");

const stat = promisify(fs.stat);

// NOTE: implement mime type return

class FSStorage{
	constructor(config){
		this.dir = config.fileDir;
		this.limit = config.limit;
		mkdirp.sync(this.dir);
	}

	async length(id){
		const result = await stat(path.join(this.dir, id));
		return result.size;
	}

	getStream(id){
		return fs.createReadStream(path.join(this.dir, id));
	}

	// `id`` is the file path and `file` is a stream
	// Returns promise of saved file's size
	set(id, file){
		return new Promise((resolve, reject) => {
			const filepath = path.join(this.dir, id);
			const fstream = fs.createWriteStream(filepath);
			let fileSize = 0;

			file.pipe(fstream);

			file.on("error", (err) => {
				fstream.destroy(err);
			});

			file.on("data", (data) => {
				fileSize += data.length;
				if(fileSize > this.limit){
					fstream.destroy(new CottaError("File size too big", "The uploaded file is over the size limit acceptable.", 413));
				}
			});

			fstream.on("error", (err) => {
				fs.unlinkSync(filepath);
				reject(err);
			});

			fstream.on("finish", () => {
				resolve(fileSize);
			});
		});
	}

	del(id){
		return Promise.resolve(fs.unlinkSync(path.join(this.dir, id)));
	}

	ping(){
		return Promise.resolve();
	}
}

module.exports = FSStorage;