const DynamicRecord = require("dynamic-record");
const chai = require("chai");
const _ = require("lodash");
const chaiHttp = require("chai-http");
chai.use(chaiHttp);
const assert = chai.assert;

const app = require("../app.js");

describe("Files Routes", function(){
	let token;

	// Setup
	before(function() {
		return chai.request(app).post("/api/tokens/generate_new_token").send({
			"username": "admin",
			"password": "admin"
		}).then((res) => {
			token = res.body.access_token;
		});
	});

	// Cleanup
	after(function() {
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

			console.log(res.body);
		});
	});

	describe("GET /api/files/:id", function(){
		it("should get metadata entry of specified file");
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
		it("should delete metadata entry of specified file");
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