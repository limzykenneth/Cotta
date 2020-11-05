const DynamicRecord = require("dynamic-record");
const chai = require("chai");
const _ = require("lodash");
const fs = require("fs/promises");
const readFile = require("fs").readFileSync;
const path = require("path");
const fetch = require("node-fetch");
const chaiHttp = require("chai-http");
chai.use(chaiHttp);
const assert = chai.assert;
const moment = require("moment");
const testImageData = _.cloneDeep(require("./json/file_data.json"));
const FileUpload = new DynamicRecord({
	tableSlug: "files_upload"
});

const app = require("../app.js");

describe("Upload Routes", function(){
	let token;
	let savedFiles = [];
	const FilesUpload = new DynamicRecord({tableSlug: "files_upload"});

	// Setup
	before(async function() {
		const res = await chai.request(app).post("/api/tokens/generate_new_token").send({
			"username": "admin",
			"password": "admin"
		});

		token = res.body.access_token;

		delete testImageData.uid;
		delete testImageData.file_permalink;
	});

	// Cleanup
	afterEach(async function() {
		const files = await FileUpload.all();
		await files.dropAll();

		for(const file of savedFiles){
			if(process.env.STORAGE_STRATEGY === "fs"){
				await fs.unlink(path.join(__dirname, "../uploads", file));
			}else if(process.env.STORAGE_STRATEGY === "mongodb"){
				// Implementation pending
			}
		}

		savedFiles = [];
	});

	/////////////////////////////////////////
	//             Test suites             //
	/////////////////////////////////////////
	describe("POST /api/upload", function(){
		it("should create a new file metadata entry in the database and respond with upload link and expiry date", async function(){
			const res = await chai.request(app)
				.post("/api/upload")
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`)
				.send(testImageData[0]);

			assert.equal(res.status, 200, "request successful with response code 200");
			assert.property(res.body, "location", "upload URL is returned");
			assert.property(res.body, "uploadExpire", "upload expire timestamp is returned");

			const file = await FilesUpload.findBy({"file_name": "test1.png"});
			assert.equal(file.data.file_name, testImageData[0].file_name, "database entry file_name field match");
			assert.equal(file.data["content-type"], testImageData[0]["content-type"], "database entry content-type field match");
			assert.equal(file.data.file_description, testImageData[0].file_description, "database entry file_description field match");
			["created_at", "modified_at", "file_owner", "uploadExpire", "uid", "file_permalink", "saved_path", "file_size"].forEach((key) => {
				assert.property(file.data, key, `database entry has property ${key}`);
			});
		});
		it("should create a series of new file metadata in the database and respond with upload links and expiry dates", async function(){
			const res = await chai.request(app)
				.post("/api/upload")
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`)
				.send(testImageData);

			assert.equal(res.status, 200, "request successful with response code 200");

			for(let i=0; i<testImageData.length; i++){
				const file = await FilesUpload.findBy({"file_name": testImageData[i].file_name});
				assert.equal(file.data.file_name, testImageData[i].file_name, "database entry file_name field match");
				assert.equal(file.data["content-type"], testImageData[i]["content-type"], "database entry content-type field match");
				assert.equal(file.data.file_description, testImageData[i].file_description, "database entry file_description field match");
				["created_at", "modified_at", "file_owner", "uploadExpire", "uid", "file_permalink", "saved_path", "file_size"].forEach((key) => {
					assert.property(file.data, key, `database entry has property ${key}`);
				});
			}
		});
		it("should respond with an error if file MIME type is not accepted", async function(){
			const res = await chai.request(app)
				.post("/api/upload")
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`)
				.send({
					"content-type": "image/gif",
					"file_name": "test1.gif",
					"file_description": "Test image 1"
				});

			assert.equal(res.status, 415, "request unsuccessful with response code 415");

			const file = await FilesUpload.findBy({"file_name": "test1.png"});
			assert.isNull(file, "entry is not saved in database");
		});
	});

	describe("POST /api/upload/:location", function(){
		it("should update the file metadata entry with latest info", async function(){
			const requester = chai.request(app).keepOpen();
			let res = await requester
				.post("/api/upload")
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`)
				.send({
					"content-type": "image/jpeg",
					"file_name": "test-image.jpg",
					"file_description": "Collection of porcelain"
				});
			const uploadID = path.basename(res.body.location);

			const file = readFile(path.join(__dirname, "./test-image.jpg"));
			res = await requester
				.post(`/api/upload/${uploadID}`)
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`)
				.type("image/jpeg")
				.send(file);

			requester.close();

			savedFiles.push(uploadID);

			const fileEntry = await FilesUpload.findBy({uid: uploadID});
			assert.equal(fileEntry.data.file_size, 39457, "file size is updated");
			assert.isNotNull(fileEntry.data.saved_path, "saved_path is now populated");
		});
		it("should respond with the file's permalink", async function(){
			const requester = chai.request(app).keepOpen();
			let res = await requester
				.post("/api/upload")
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`)
				.send({
					"content-type": "image/jpeg",
					"file_name": "test-image.jpg",
					"file_description": "Collection of porcelain"
				});
			const uploadID = path.basename(res.body.location);

			const file = readFile(path.join(__dirname, "./test-image.jpg"));
			res = await requester
				.post(`/api/upload/${uploadID}`)
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`)
				.type("image/jpeg")
				.send(file);

			requester.close();

			savedFiles.push(uploadID);

			assert.equal(res.body.resource_path, `http://localhost:3000/uploads/${uploadID}`, "returned URL match expectation");
		});

		if(process.env.STORAGE_STRATEGY === "fs"){
			it("should save the file to the file system with unique name", async function(){
				const requester = chai.request(app).keepOpen();
				let res = await requester
					.post("/api/upload")
					.set("Content-Type", "application/json")
					.set("Authorization", `Bearer ${token}`)
					.send({
						"content-type": "image/jpeg",
						"file_name": "test-image.jpg",
						"file_description": "Collection of porcelain"
					});
				const uploadID = path.basename(res.body.location);

				const file = readFile(path.join(__dirname, "./test-image.jpg"));
				res = await requester
					.post(`/api/upload/${uploadID}`)
					.set("Content-Type", "application/json")
					.set("Authorization", `Bearer ${token}`)
					.type("image/jpeg")
					.send(file);

				requester.close();

				savedFiles.push(uploadID);

				assert.property(res.body, "resource_path", "uploaded resource URL is returned");
				assert.isOk(await fs.stat(path.join(__dirname, "../uploads", uploadID)), "file exist in file system");

				const uploadedFile = readFile(path.join(__dirname, "../uploads", uploadID));
				assert.deepEqual(file, uploadedFile, "uploaded file match original");
			});
			it("should accept a file URL and download the resource to the file system", async function(){
				await fetch("https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Blanche_Dishware.jpg/800px-Blanche_Dishware.jpg")
					.catch((err) => {
						console.log("Cannot reach remote file, skipping test case");
						this.skip();
					})
					.then((res) => res.buffer())
					.then(async (file) => {
						const requester = chai.request(app).keepOpen();
						let res = await requester
							.post("/api/upload")
							.set("Content-Type", "application/json")
							.set("Authorization", `Bearer ${token}`)
							.send({
								"content-type": "image/jpeg",
								"file_name": "test-image.jpg",
								"file_description": "Collection of porcelain"
							});
						const uploadID = path.basename(res.body.location);

						res = await requester
							.post(`/api/upload/${uploadID}`)
							.set("Content-Type", "application/json")
							.set("Authorization", `Bearer ${token}`)
							.send({
								url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Blanche_Dishware.jpg/800px-Blanche_Dishware.jpg"
							});

						requester.close();

						assert.property(res.body, "resource_path", "uploaded resource URL is returned");
						assert.isOk(await fs.stat(path.join(__dirname, "../uploads", uploadID)), "file exist in file system");

						const uploadedFile = readFile(path.join(__dirname, "../uploads", uploadID));
						assert.deepEqual(file, uploadedFile, "uploaded file match original");

						savedFiles.push(uploadID);
					});
			});
			it("should respond with error if the file size is over the limit", async function(){
				const requester = chai.request(app).keepOpen();
				let res = await requester
					.post("/api/upload")
					.set("Content-Type", "application/json")
					.set("Authorization", `Bearer ${token}`)
					.send({
						"content-type": "image/jpeg",
						"file_name": "test-image-large.jpg",
						"file_description": "Collection of porcelain"
					});
				const uploadID = path.basename(res.body.location);

				const file = readFile(path.join(__dirname, "./test-image-large.jpg"));
				res = await requester
					.post(`/api/upload/${uploadID}`)
					.set("Content-Type", "application/json")
					.set("Authorization", `Bearer ${token}`)
					.type("image/jpeg")
					.send(file);

				requester.close();

				assert.equal(res.status, 413, "correct status code 413 is returned");
				try{
					await fs.stat(path.join(__dirname, "../uploads", uploadID));
					assert.fail("file not uploaded to file system");
				}catch(err){
					if(err.code !== "ENOENT"){
						assert.fail();
					}
				}
			});
		}else if(process.env.STORAGE_STRATEGY === "mongodb"){
			it("should save the file to MongoDB with unique name");
			it("should accept a file URL and download the resource to MongoDB");
			it("should respond with error if the file size is over the limit");
		}

		it("should respond with error if the upload URL doesn't exist in the database", async function(){
			const file = readFile(path.join(__dirname, "./test-image.jpg"));
			const res = await chai.request(app)
				.post("/api/upload/invalid")
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`)
				.type("image/jpeg")
				.send(file);

			assert.equal(res.status, 400, "correct status code 400 is returned");
		});
		it("should respond with error if the upload URL has expired", async function(){
			const requester = chai.request(app).keepOpen();
			let res = await requester
				.post("/api/upload")
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`)
				.send({
					"content-type": "image/jpeg",
					"file_name": "test-image-large.jpg",
					"file_description": "Collection of porcelain"
				});
			const uploadID = path.basename(res.body.location);

			const fileEntry = await FilesUpload.findBy({uid: uploadID});
			fileEntry.data.uploadExpire = moment().subtract(1, "day").format();
			await fileEntry.save();

			const file = readFile(path.join(__dirname, "./test-image.jpg"));
			res = await requester
				.post(`/api/upload/${uploadID}`)
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`)
				.type("image/jpeg")
				.send(file);

			requester.close();

			assert.equal(res.status, 400, "correct status code 400 is returned");
		});
		it("should respond with error if the upload URL has already been used", async function(){
			const requester = chai.request(app).keepOpen();
			let res = await requester
				.post("/api/upload")
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`)
				.send({
					"content-type": "image/jpeg",
					"file_name": "test-image.jpg",
					"file_description": "Collection of porcelain"
				});
			const uploadID = path.basename(res.body.location);

			const file = readFile(path.join(__dirname, "./test-image.jpg"));
			res = await requester
				.post(`/api/upload/${uploadID}`)
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`)
				.type("image/jpeg")
				.send(file);

			savedFiles.push(uploadID);

			res = await requester
				.post(`/api/upload/${uploadID}`)
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`)
				.type("image/jpeg")
				.send(file);

			requester.close();

			assert.equal(res.status, 400, "correct status code 400 is returned");
		});
		it("should respond with error if it cannot fetch the file over the given URL", async function(){
			const requester = chai.request(app).keepOpen();
			let res = await requester
				.post("/api/upload")
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`)
				.send({
					"content-type": "image/jpeg",
					"file_name": "test-image.jpg",
					"file_description": "Collection of porcelain"
				});
			const uploadID = path.basename(res.body.location);

			res = await requester
				.post(`/api/upload/${uploadID}`)
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`)
				.send({
					url: "https://localhost:3000/nothing_here"
				});

			requester.close();

			assert.isAtLeast(res.status, 400, "server responded with an error code");
		});
		it("should respond with error if the returned MIME type from given URL doesn't match original", async function(){
			await fetch("https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Blanche_Dishware.jpg/800px-Blanche_Dishware.jpg")
				.catch((err) => {
					console.log("Cannot reach remote file, skipping test case");
					this.skip();
				})
				.then(async () => {
					const requester = chai.request(app).keepOpen();
					let res = await requester
						.post("/api/upload")
						.set("Content-Type", "application/json")
						.set("Authorization", `Bearer ${token}`)
						.send({
							"content-type": "image/png",
							"file_name": "test-image.png",
							"file_description": "Collection of porcelain"
						});
					const uploadID = path.basename(res.body.location);

					res = await requester
						.post(`/api/upload/${uploadID}`)
						.set("Content-Type", "application/json")
						.set("Authorization", `Bearer ${token}`)
						.send({
							url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Blanche_Dishware.jpg/800px-Blanche_Dishware.jpg"
						});

					requester.close();

					assert.equal(res.status, 400, "correct status code 400 is returned");
				});
		});
		it("should respond with error if MIME type of file uploaded is not accepted", async function(){
			const requester = chai.request(app).keepOpen();
			let res = await requester
				.post("/api/upload")
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`)
				.send({
					"content-type": "image/png",
					"file_name": "test-image.png",
					"file_description": "Collection of porcelain"
				});
			const uploadID = path.basename(res.body.location);

			const file = readFile(path.join(__dirname, "./test-image.jpg"));
			res = await requester
				.post(`/api/upload/${uploadID}`)
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`)
				.type("image/jpeg")
				.send(file);

			requester.close();

			assert.equal(res.status, 400, "correct status code 400 is returned");
		});
	});
});