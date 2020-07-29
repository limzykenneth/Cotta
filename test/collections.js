const DynamicRecord = require("dynamic-record");
const chai = require("chai");
const _ = require("lodash");
const chaiHttp = require("chai-http");
chai.use(chaiHttp);
const assert = chai.assert;
const testSchema = require("./json/test_1.schema.json");
const testAppCollection = require("./json/test_1_AppCollection.json");
const testData = Object.freeze(_.cloneDeep(require("./json/test_1_data.json")));
const newModel = Object.freeze({
	"field_1": "<p>Fish cake coleslaw roe, chicken burger skate battered roe roe roe jacket potato gravy beef burger. </p>",
	"field_2": "chicken burger peas fish cake",
	"field_3": "mayonaisemayonaise@hotmail.com",
	"field_4": [
		"three"
	],
	"field_5": "two"
});

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
	describe("GET /api/collections/:slug/", function(){
		it("should retrieve all available models under the specified collection", function(){
			return chai.request(app).get("/api/collections/test_1").set("Content-Type", "application/json").set("Authorization", `Bearer ${token}`).then((res) => {
				assert.lengthOf(res.body, testData.length, "returned object has the expected length");
				_.find(testData, {"field_3": "onionpie@hotmail.com"})._uid = 1;
				_.find(testData, {"field_3": "batteredsaveloy@gmail.com"})._uid = 2;

				_.each(res.body, (el) => {
					assert.deepInclude(testData, el, "returns the expected data");
				});
			});
		});
	});

	describe("GET /api/collections/:slug/:ID", function(){
		it("should retrieve only the model specified by the provided ID", function(){
			return chai.request(app).get("/api/collections/test_1/1").set("Content-Type", "application/json").set("Authorization", `Bearer ${token}`).then((res) => {
				let model = _.find(testData, {"field_3": "onionpie@hotmail.com"});
				model._uid = 1;
				assert.deepEqual(res.body, model, "returns the expected model");
			});
		});
		it("should return a 404 in the case of non existing model", function(){
			return chai.request(app).get("/api/collections/test_1/3").set("Content-Type", "application/json").set("Authorization", `Bearer ${token}`).then((res) => {
				assert.equal(res.status, 404, "returns with status code 404");
				assert.equal(res.body.title, "Model does not exist", "returns with correct message");
			});
		});
	});

	describe("POST /api/collections/:slug", function(){
		it("should create a new model under the specified collection", function(){
			return chai.request(app)
				.post("/api/collections/test_1")
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`)
				.send(newModel)
				.then((res) => {
					// Check the returned data
					assert.equal(res.body._uid, 3, "returns the correct uid");
					assert.equal(res.body.field_1, newModel.field_1, "returns the correct WYSIWYG field data");
					assert.equal(res.body.field_2, newModel.field_2, "returns the correct text field data");
					assert.equal(res.body.field_3, newModel.field_3, "returns the correct email field data");
					assert.deepEqual(res.body.field_4, newModel.field_4, "returns the correct checkbox field data");
					assert.equal(res.body.field_5, newModel.field_5, "returns the correct radiobox field data");
				}).then(() => {
					// Check the database entry manually
					const Test1 = new DynamicRecord({
						tableSlug: "test_1"
					});

					return Test1.findBy({_uid: 3}).then((model) => {
						assert.equal(model.data.field_1, newModel.field_1, "database has the correct WYSIWYG field data");
						assert.equal(model.data.field_2, newModel.field_2, "database has the correct text field data");
						assert.equal(model.data.field_3, newModel.field_3, "database has the correct email field data");
						assert.deepEqual(model.data.field_4, newModel.field_4, "database has the correct checkbox field data");
						assert.equal(model.data.field_5, newModel.field_5, "database has the correct radiobox field data");
					});
				});
		});
		it("should reject a model with the wrong schema with a 400 response", function(){
			const rejectModel = {
				field_1: 12
			};
			return chai.request(app)
				.post("/api/collections/test_1")
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`)
				.send(rejectModel)
				.then((res) => {
					assert.equal(res.status, 400, "returns with status code 400");
					assert.equal(res.body.title, "Invalid Schema", "returns with correct message");
				});
		});
		it("should reponse to file upload fields with upload URL");
	});

	describe("POST /api/collections/:slug/:ID", function(){
		it("should edit the exisitng model in the collection specified by the provided ID", function(){
			return chai.request(app)
				.post("/api/collections/test_1")
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`)
				.send(newModel)
				.then((res) => {
					const modifyModel = res.body;
					modifyModel.field_2 = "Changed this field";

					return chai.request(app)
						.post("/api/collections/test_1/4")
						.set("Content-Type", "application/json")
						.set("Authorization", `Bearer ${token}`)
						.send(modifyModel);
				}).then((res) => {
					assert.equal(res.body.field_2, "Changed this field", "field is changed in response");

					return chai.request(app)
						.get("/api/collections/test_1/4")
						.set("Content-Type", "application/json")
						.set("Authorization", `Bearer ${token}`);
				}).then((res) => {
					assert.equal(res.body.field_2, "Changed this field", "field is changed in response");
				});
		});
		it("should reject a model with the wrong schema with a 400 response", function(){
			return chai.request(app)
				.post("/api/collections/test_1")
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`)
				.send(newModel)
				.then((res) => {
					const modifyModel = res.body;
					modifyModel.field_2 = 24;

					return chai.request(app)
						.post("/api/collections/test_1/5")
						.set("Content-Type", "application/json")
						.set("Authorization", `Bearer ${token}`)
						.send(modifyModel);
				}).then((res) => {
					assert.equal(res.status, 400, "returns with status code 400");
					assert.equal(res.body.title, "Invalid Schema", "returns with correct message");
				});
		});
		it("should update the file entry if it was changed");
	});

	describe("DEL /api/collections/:slug/:ID", function(){
		it("should delete the existing model in the collection specified by the provided ID", function(){
			return chai.request(app)
				.post("/api/collections/test_1")
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`)
				.send(newModel)
				.then((res) => {
					return chai.request(app)
						.delete("/api/collections/test_1/6")
						.set("Content-Type", "application/json")
						.set("Authorization", `Bearer ${token}`);
				}).then((res) => {
					return chai.request(app)
						.get("/api/collections/test_1/6")
						.set("Content-Type", "application/json")
						.set("Authorization", `Bearer ${token}`);
				}).then((res) => {
					assert.equal(res.status, 404, "returns with status code 404");
					assert.equal(res.body.title, "Model does not exist", "returns with correct message");
				});
		});
		it("should return a 404 in the case of non existing model", function(){
			return chai.request(app)
				.delete("/api/collections/test_1/10")
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`)
				.then((res) => {
					assert.equal(res.status, 404, "returns with status code 404");
					assert.equal(res.body.title, "Model does not exist", "returns with correct message");
				});
		});
	});
});