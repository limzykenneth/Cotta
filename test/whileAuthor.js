const request = require("supertest");
const session = require("supertest-session");
const assert = require("chai").assert;
const _ = require("lodash");
const app = require("../app.js");

var testSession = null;

beforeEach(function(){
	testSession = session(app);
});

describe("While signed in as admin", function(){
	var authenticatedSession;

	beforeEach(function(done){
		testSession.post("/admin/login")
			.send({username: "author", password: "author"})
			.expect(302)
			.end(function(err){
				if(err) throw err;
				authenticatedSession = testSession;
				return done();
			});
	});

	// GET requests
	var expectOKResponse = function(urls, done){
		if(typeof urls == "string"){
			authenticatedSession.get(urls)
				.expect(200, done);
		}else if(Array.isArray(urls)){
			var responses = [];
			_.each(urls, function(url){
				responses.push(authenticatedSession.get(url)
					.expect(200));
			});

			Promise.all(responses)
			.then(function(){
				done();
			});
		}
	};

	var expectForbiddenResponse = function(urls, done){
		if(typeof urls == "string"){
			authenticatedSession.get(urls)
				.expect(403, done);
		}else if(Array.isArray(urls)){
			var responses = [];
			_.each(urls, function(url){
				responses.push(authenticatedSession.get(url)
					.expect(403));
			});

			Promise.all(responses)
			.then(function(){
				done();
			});
		}
	};

	describe("GET /admin/collections", function(){
		it("should return with status code 200", function(done){
			expectOKResponse("/admin/collections", done);
		});
	});

	describe("GET /admin/collectionsn/new", function(){
		it("should return with status code 403", function(done){
			expectForbiddenResponse("/admin/collections/new", done);
		});
	});

	describe("GET /admin/collections/edit/:collection", function(){
		it("should return with status code 403", function(done){
			expectForbiddenResponse("/admin/collections/edit/test_1", done);
		});
	});

	describe("GET /admin/collectionsn/:collection", function(){
		it("should return with status code 200", function(done){
			expectOKResponse("/admin/collections/test_1", done);
		});
	});

	describe("GET /admin/collectionsn/:collection/new", function(){
		it("should return with status code 200", function(done){
			expectOKResponse("/admin/collections/test_1/new", done);
		});
	});

	describe("GET /admin/collectionsn/:collection/:id", function(){
		it("should return with status code 200", function(done){
			expectOKResponse("/admin/collections/test_1/1", done);
		});
	});

	describe("GET /admin/collectionsn/:collection/:id/edit", function(){
		it("should return with status code 200", function(done){
			expectOKResponse("/admin/collections/test_1/1/edit", done);
		});
	});

	describe("GET /admin/users", function(){
		it("should return with status code 403", function(done){
			expectForbiddenResponse("/admin/users", done);
		});
	});

	describe("GET /admin/users/:userid", function(){
		it("should return with status code 403", function(done){
			expectForbiddenResponse(["/admin/users/admin",
							  "/admin/users/editor",
							  "/admin/users/author"],
			done);
		});
	});

	describe("GET /admin/account", function(){
		it("should return with status code 200", function(done){
			expectOKResponse("/admin/account", done);
		});
	});

	describe("GET /admin/config", function(){
		it("should return with status code 403", function(done){
			expectForbiddenResponse("/admin/config", done);
		});
	});

	// POST requests
	// /schema
	describe("POST /admin/schema/new", function(){
		it("should return a JSON object with status \"success\"");
		it("should create a new schema in the database");
	});

	describe("POST /admin/schema/edit/:collection", function(){
		it("should return a JSON object with status \"success\"");
		it("should change the schema entry of the collection in the database");
	});

	describe("POST(DELETE) /admin/schema/delete/:collection", function(){
		it("should redirect to /admin/collections");
		it("should remove all traces of the schema in the database");
	});

	// /collections
	describe("POST /admin/collections/:collection/new", function(){
		it("should return a JSON object with status \"success\"");
		it("should create a new model in the collection in the database");
	});

	describe("POST /admin/collections/:collection/:id/edit", function(){
		it("should return a JSON object with status \"success\"");
		it("should create a new model in the collection in the database");
	});

	describe("POST(DELETE) /admin/collections/:collection/:id", function(){
		it("should redirect to /admin/collections/:collection");
		it("should remove the all traces of the model in the database");
	});

	// /account
	describe("POST /admin/account", function(){
		it("should change the user's password");
	});

	// /users
	describe("POST /admin/users/:id", function(){
		it("should change the user's role");
	});

	describe("POST(DELETE) /admin/users/:id", function(){
		// Will need to test the model are correctly realocated (pending implementation)
		it("should remove the user from the database");
	});
});