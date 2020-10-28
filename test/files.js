const DynamicRecord = require("dynamic-record");
const chai = require("chai");
const _ = require("lodash");
const chaiHttp = require("chai-http");
chai.use(chaiHttp);
const assert = chai.assert;
const testImageData = _.cloneDeep(require("./json/file_data.json"));
testImageData.file_permalink = "http://localhost:3000/testpath";

const app = require("../app.js");

describe("Files Routes", function(){
	let token;
	const FilesUpload = new DynamicRecord({tableSlug: "files_upload"});

	// Setup
	before(async function() {
		const res = await chai.request(app).post("/api/tokens/generate_new_token").send({
			"username": "admin",
			"password": "admin"
		});

		token = res.body.access_token;
	});

	// Cleanup
	after(async function() {
	});

	/////////////////////////////////////////
	//             Test suites             //
	/////////////////////////////////////////
	describe("GET /api/files", function(){
		it("should get all files metadata entries", async function(){
			let res = await chai.request(app)
				.get("/api/files")
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`);

			assert.lengthOf(res.body, 1);
			assert.deepEqual(res.body[0], testImageData, "data returned match expected");
		});
	});

	describe("GET /api/files/:id", function(){
		it("should get metadata entry of specified file", async function(){
			let res = await chai.request(app)
				.get("/api/files/test_id")
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`);

			assert.deepEqual(res.body, testImageData, "data returned match expected");
		});
		it("should return a 404 if specified file doesn't exist", async function(){
			let res = await chai.request(app)
				.get("/api/files/invalid")
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`);
			assert.equal(res.status, 404, "status code is 404");
			assert.deepEqual(res.body, {
				title: "File does not exist",
				detail: "The requested file with ID \"invalid\" does not exist."
			}, "response message is correct");
		});
	});

	describe("DEL /api/files/:id", function(){
		it("should delete metadata entry of specified file", async function(){
			const newFile = new FilesUpload.Model({
				"uid": "delete_me",
				"content-type": "image/jpeg",
				"file_name": "test.jpg",
				"file_description": "Test delete image",
				"file_permalink": "<%= root %>/deletepath"
			});

			await newFile.save();

			let res = await chai.request(app)
				.delete("/api/files/delete_me")
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`);

			assert.equal(res.status, 200, "status code is 200");
			assert.deepEqual(res.body, {
				detail: "File \"delete_me\" deleted."
			}, "response message is correct");

			const deletedFile = await FilesUpload.findBy({"uid": "delete_me"});
			assert.isNull(deletedFile, "file metadata deleted in database");
		});
		it("should return a 404 if specified file doesn't exist", async function(){
			let res = await chai.request(app)
				.delete("/api/files/invalid")
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`);
			assert.equal(res.status, 404, "status code is 404");
			assert.deepEqual(res.body, {
				title: "File does not exist",
				detail: "The requested file with ID \"invalid\" does not exist."
			}, "response message is correct");
		});
	});
});