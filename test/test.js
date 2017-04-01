const request = require("supertest");
const assert = require("chai").assert;
const app = require("../app.js");

// Public front end ------------------------------------------------
describe("GET /", function(){
	it("should return with status code 200", function(done){
		request(app)
			.get("/")
			.expect(200, done);
	});
});

// Public API ------------------------------------------------------
describe("GET /api", function(){
	it("should return with status code 200", function(done){
		request(app)
			.get("/api")
			.expect(200, done);
	});
});

// Control panel ---------------------------------------------------
describe("While unauthorised", function(){
	// Unathorised redirects
	var unauthRedirect = function(path, method){
		it("should return with status code 302 and redirect to /admin/login", function(done){
			var req = request(app);
			if(method == "POST"){
				req = req.post(path);
			}else if(method == "PUT"){
				req = req.put(path);
			}else if(method == "DELETE"){
				req = req.delete(path);
			}else{
				req = req.get(path);
			}

			req.expect(302)
				.end(function(err, res){
					assert.equal(res.headers.location, "/admin/login", "Redirected to /admin/login");
					done();
				});
		});
	};
	describe("GET /admin", function(){
		unauthRedirect("/admin");
	});
	describe("GET /admin/collection", function(){
		unauthRedirect("/admin/collection");
	});
	describe("GET /admin/users", function(){
		unauthRedirect("/admin/users");
	});
	describe("GET /admin/account", function(){
		unauthRedirect("/admin/account");
	});
	describe("GET /admin/config", function(){
		unauthRedirect("/admin/config");
	});
	describe("POST /admin/schema/new", function(){
		unauthRedirect("/admin/schema/new", "POST");
	});

	// Logins
	describe("GET /admin/login", function(){
		it("should return with status code 200", function(done){
			request(app)
				.get("/admin/login")
				.expect(200, done);
		});
	});
	describe("POST /admin/login", function(){
		it("should log the user in and redirect to /admin", function(done){
			request(app)
				.post("/admin/login")
				.type("form")
				.send({
					"username": "admin",
					"password": "admin"
				})
				.expect(200)
				.end(function(err, res){
					assert.equal(res.headers.location, "/admin", "Redirected to /admin");

					// Clean up
					request(app)
						.get("/admin/logout")
						.expect(302, done);
				});
		});
	});

	// Signups
	describe("GET /admin/signup", function(){
		it("should return with status code 200", function(done){
			request(app)
				.get("/admin/signup")
				.expect(200, done);
		});
	});

	describe("POST /admin/signup", function(){
		// it("should sign the user up and redirect to /admin/login, login cred should work", function(done){
		// 	request(app)
		// 		.post("/admin/signup")
		// 		.type("form")
		// 		.send({
		// 			"username": "root",
		// 			"password": "root"
		// 		})
		// 		.expect(302)
		// 		.end(function(err, res){
		// 			assert.equal(res.body.status, "success", "Implementation not complete");

		// 			// Try logging in with new credentials
		// 			request(app)
		// 				.post("/admin/login")
		// 				.type("form")
		// 				.send({
		// 					"username": "root",
		// 					"password": "root"
		// 				})
		// 				.expect(200)
		// 				.end(function(err, res){
		// 					assert.equal(res.headers.location, "/admin", "Redirected to /admin");

		// 					// Clean up, delete new credentials
		// 					// Implementation pending
		// 					done();
		// 				});
		// 		});
		// });

		it("should not allow duplicate usernames");
	});
});