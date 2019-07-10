const chai = require("chai");
const DynamicRecord = require("dynamic-record");
const _ = require("lodash");
const chaiHttp = require("chai-http");
chai.use(chaiHttp);
const assert = chai.assert;
const testSchema = require("./json/test_1.schema.json");
const testAppCollection = require("./json/test_1_AppCollection.json");
const testData = require("./json/test_1_data.json");

const app = require("../app.js");

describe("Collections Routes", function(){
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
	describe("GET /api/collections/:slug/:ID", function(){
		it("should retrieve all available models under the specified collection");
	});

	describe("GET /api/collections/:slug/:ID", function(){
		it("should retrieve only the model specified by the provided ID");
		it("should return a 404 in the case of non existing model");
	});

	describe("POST /api/collections/:slug", function(){
		it("should create a new model under the specified collection");
		it("should reject a model with the wrong schema with a 400 response");
	});

	describe("POST /api/collections/:slug/:ID", function(){
		it("should edit the exisitng model in the collection specified by the provided ID");
		it("should reject a model with the wrong schema with a 400 response");
	});

	describe("DEL /api/collections/:slug/:ID", function(){
		it("should delete the existing model in the collection specified by the provided ID");
		it("should return a 404 in the case of non existing model");
	});
});