const request = require("supertest");
const assert = require("chai").assert;
const app = require("../app.js");
const connect = require("../utils/database.js");

describe("While signed in as admin", function(){
	request(app)
	.post("/admin/login")
	.type("form")
	.send({
		"username": "admin",
		"password": "admin"
	})
	.expect(302)
	.end(function(err, res){
		describe("GET /admin/collection", function(){
			it("should return with status code 200");
		});

		describe("GET /admin/users", function(){
			it("should return with status code 200");
		});

		describe("GET /admin/account", function(){
			it("should return with status code 200");
		});

		describe("GET /admin/config", function(){
			it("should return with status code 200");
		});
	});
});