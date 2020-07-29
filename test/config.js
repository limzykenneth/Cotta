const DynamicRecord = require("dynamic-record");
const chai = require("chai");
const _ = require("lodash");
const chaiHttp = require("chai-http");
chai.use(chaiHttp);
const assert = chai.assert;

const app = require("../app.js");

describe("Config Routes", function(){
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
	describe("GET /api/config", function() {
		it("should retrieve all available configs and their values");
	});

	describe("GET /api/config/:config_name", function() {
		it("should retrieve the specified config and its value");
	});

	describe("POST /api/config/:config_name", function() {
		it("should edit the value of the specified config");
	});
});