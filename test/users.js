const DynamicRecord = require("dynamic-record");
const chai = require("chai");
const _ = require("lodash");
const chaiHttp = require("chai-http");
chai.use(chaiHttp);
const assert = chai.assert;

const app = require("../app.js");

const newUser = Object.freeze({
	"username": "test_username",
	"password": "test_username"
});

describe("Users Routes", function(){
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
	describe("GET /api/users", function() {
		it("should retrieve info of all users", async function() {
			const res = await chai.request(app)
				.get("/api/users")
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`);

			assert.isArray(res.body, "return body is an array");
			assert.lengthOf(res.body, 1, "return body has length of 1");
			assert.equal(res.body[0].username, "admin", "return username is admin");
			assert.equal(res.body[0].role, "administrator", "return user role is administrator");
			assert.exists(res.body[0].date_created, "return user has date_created field");
		});
	});

	describe("GET /api/users/:username", function() {
		it("should retrieve info of requested user", async function() {
			const res = await chai.request(app)
				.get("/api/users/admin")
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`);

			assert.isObject(res.body, "return body is an object");
			assert.equal(res.body.username, "admin", "return username is admin");
			assert.equal(res.body.role, "administrator", "return user role is administrator");
			assert.exists(res.body.date_created, "return user has date_created field");
		});
	});

	describe("POST /api/users", function() {
		afterEach(async function(){
			const usersRecord = new DynamicRecord({
				tableSlug: "_users_auth"
			});
			const result = await usersRecord.findBy({username: newUser.username});
			if(result){
				await result.destroy();
			}
		});

		it("should create a new user", async function() {
			await chai.request(app)
				.post("/api/users")
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`)
				.send(newUser);

			const usersRecord = new DynamicRecord({
				tableSlug: "_users_auth"
			});

			const result = await usersRecord.findBy({username: newUser.username});
			assert.exists(result, "user entry exist in database");
			assert.equal(result.data.username, newUser.username, "new user username match");
			assert.equal(result.data.role, "author", "new user role default to author");
			assert.exists(result.data.hash, "new user password is hashed");
			assert.exists(result.data.date_created, "new user creation time recorded");
		});
	});

	describe("POST /api/user/:username", function() {
		afterEach(async function(){
			const usersRecord = new DynamicRecord({
				tableSlug: "_users_auth"
			});
			const result = await usersRecord.findBy({username: newUser.username});
			if(result){
				await result.destroy();
			}
		});

		it("should edit info of specified user", async function() {
			await chai.request(app)
				.post("/api/users")
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`)
				.send(newUser);

			await chai.request(app)
				.post(`/api/users/${newUser.username}`)
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`)
				.send({
					username: newUser.username,
					role: "editor"
				});

			const usersRecord = new DynamicRecord({
				tableSlug: "_users_auth"
			});

			const result = await usersRecord.findBy({username: newUser.username});
			assert.equal(result.data.role, "editor", "new user role changed to editor");
		});
	});

	describe("DEL /api/users/:username", function() {
		afterEach(async function(){
			const usersRecord = new DynamicRecord({
				tableSlug: "_users_auth"
			});
			const result = await usersRecord.findBy({username: newUser.username});
			if(result){
				await result.destroy();
			}
		});

		it("should delete the specified user", async function() {
			await chai.request(app)
				.post("/api/users")
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`)
				.send(newUser);

			const res = await chai.request(app)
				.delete(`/api/users/${newUser.username}`)
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`);

			const usersRecord = new DynamicRecord({
				tableSlug: "_users_auth"
			});
			const result = await usersRecord.findBy({username: newUser.username});

			assert.isNull(result, "user entry no longer in database");
		});
	});
});