const request = require("supertest");
const session = require("supertest-session");
const assert = require("chai").assert;
const app = require("../app.js");
const connect = require("../utils/database.js");

var testSession = null;

beforeEach(function(){
	testSession = session(app);
});

describe("While signed in as admin", function(){
	var authenticatedSession;

	beforeEach(function(done){
		testSession.post("/admin/login")
			.send({username: "admin", password: "admin"})
			.expect(302)
			.end(function(err){
				if(err) throw err;
				authenticatedSession = testSession;
				return done();
			});
	});

	var expectOKResponse = function(url, done){
		authenticatedSession.get(url)
			.expect(200, done);
	};

	describe("GET /admin/collections", function(){
		it("should return with status code 200", function(done){
			expectOKResponse("/admin/collections", done);
		});
	});

	describe("GET /admin/users", function(){
		it("should return with status code 200", function(done){
			expectOKResponse("/admin/users", done);
		});
	});

	describe("GET /admin/account", function(){
		it("should return with status code 200", function(done){
			expectOKResponse("/admin/account", done);
		});
	});

	describe("GET /admin/config", function(){
		it("should return with status code 200", function(done){
			expectOKResponse("/admin/config", done);
		});
	});
});