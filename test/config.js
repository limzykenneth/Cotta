const DynamicRecord = require("dynamic-record");
const chai = require("chai");
const _ = require("lodash");
const chaiHttp = require("chai-http");
chai.use(chaiHttp);
const assert = chai.assert;

const app = require("../app.js");

const defaultConfig = Object.freeze([
	{
		config_name: "bcrypt_hash_cost",
		config_value: 10,
		config_type: "number"
	},
	{
		config_name: "allow_anonymous_tokens",
		config_value: false,
		config_type: "boolean"
	},
	{
		config_name: "allow_unauthorised",
		config_value: false,
		config_type: "boolean"
	},
	{
		config_name: "allow_signup",
		config_value: false,
		config_type: "boolean"
	},
	{
		config_name: "upload_file_size_max",
		config_value: 1000000,
		config_type: "number"
	},
	{
		config_name: "upload_file_accepted_MIME",
		config_value: [ "image/jpeg", "image/png" ],
		config_type: "array"
	}
]);

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
		it("should retrieve all available configs and their values", function(){
			return chai.request(app).get("/api/config").set("Content-Type", "application/json").set("Authorization", `Bearer ${token}`).then((res) => {
				assert.deepEqual(res.body, defaultConfig, "return body match default configs");
			});
		});
	});

	describe("GET /api/config/:config_name", function() {
		it("should retrieve the specified config and its value", async function(){
			let res = await chai.request(app)
				.get("/api/config/bcrypt_hash_cost")
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`);
			assert.deepEqual(res.body, {
				config_name: "bcrypt_hash_cost",
				config_value: 10,
				config_type: "number"
			}, "config bcrypt_hash_cost value is 10");

			res = await chai.request(app)
				.get("/api/config/upload_file_accepted_MIME")
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`);
			assert.deepEqual(res.body, {
				config_name: "upload_file_accepted_MIME",
				config_value: [ "image/jpeg", "image/png" ],
				config_type: "array"
			}, "config upload_file_accepted_MIME value is correct");
		});
	});

	describe("POST /api/config/:config_name", function() {
		afterEach(async function(){
			await chai.request(app)
				.post("/api/config/allow_signup")
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`)
				.send({
					config_name: "allow_signup",
					config_value: false,
					config_type: "boolean"
				});
		});

		it("should edit the value of the specified config", async function(){
			await chai.request(app)
				.post("/api/config/allow_signup")
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`)
				.send({
					config_name: "allow_signup",
					config_value: true,
					config_type: "boolean"
				});

			let res = await chai.request(app)
				.get("/api/config/allow_signup")
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`);

			assert.deepEqual(res.body, {
				config_name: "allow_signup",
				config_value: true,
				config_type: "boolean"
			}, "modified config allow_signup value is correct");
		});
	});
});