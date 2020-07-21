// Use mongodb as a file store
// Implementation pending
// https://medium.com/@dineshuthakota/how-to-save-file-in-mongodb-using-node-js-1a9d09b019c1
// https://mongodb.github.io/node-mongodb-native/3.3/api/GridFSBucket.html

const mongodb = require("mongodb");

class MongoDBStorage{
	constructor(config){
		this.client = new mongodb.MongoClient(config.uri, {
			useUnifiedTopology: true,
			useNewUrlParser: true
		});
		this.connection = this.client.connect();
		this.limit = config.limit;
	}

	close(){
		this.client.close();
	}

	async length(id){
		await this.connection;
		const db = this.client.db();
		const bucket = new mongodb.GridFSBucket(db);
		const fileMetadata = await bucket.find({filename: id}).limit(1).toArray();
		return fileMetadata[0].length;
	}

	async contentType(id){
		await this.connection;
		const db = this.client.db();
		const bucket = new mongodb.GridFSBucket(db);
		const fileMetadata = await bucket.find({filename: id}).limit(1).toArray();
		return fileMetadata[0].contentType;
	}

	getStream(id){
		const db = this.client.db();
		const bucket = new mongodb.GridFSBucket(db);
		return bucket.openDownloadStreamByName(id);
	}

	// `id`` is the file path and `file` is a stream
	// Returns promise of saved file's size
	set(id, file, contentType=null){
		const db = this.client.db();
		const bucket = new mongodb.GridFSBucket(db);
		return new Promise((resolve, reject) => {
			const writeStream = bucket.openUploadStream(id, {
				contentType: contentType
			});
			let fileSize = 0;

			file.pipe(writeStream)
				.on("error", (err) => {
					writeStream.abort();
					reject(err);
				});
			file.on("data", (data) => {
				fileSize += data.length;
				if(fileSize > this.limit){
					writeStream.abort();
					reject(new CottaError("File size too big", "The uploaded file is over the size limit acceptable.", 413));
				}
			});

			writeStream.on("error", (err) => {
				writeStream.abort();
				reject(err);
			});

			writeStream.on("finish", () => {
				resolve(fileSize);
			});
		});
	}

	async del(id){
		// NOTE: test whether it can handle non existing file
		await this.connection;
		const db = this.client.db();
		const bucket = new mongodb.GridFSBucket(db);
		return bucket.delete(id);
	}

	ping(){
		if(this.client.isConnected()){
			return Promise.resolve();
		}else{
			return Promise.reject(new Error("MongoDB client is not connected"));
		}
	}
}

module.exports = MongoDBStorage;