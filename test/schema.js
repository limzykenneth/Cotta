const chai = require("chai");
const DynamicRecord = require("dynamic-record");
const _ = require("lodash");
const chaiHttp = require("chai-http");
chai.use(chaiHttp);
const assert = chai.assert;
const testSchema = require("./json/test_1.schema.json");
const test3Schema = require("./json/test_3.schema.json");
const testAppCollection = require("./json/test_1_AppCollection.json");

const app = require("../app.js");

describe("Schema Routes", function(){
	let token, AppCollections;

	// Setup
	before(async function() {
		const res = await chai.request(app).post("/api/tokens/generate_new_token").send({
			"username": "admin",
			"password": "admin"
		});
		token = res.body.access_token;

		AppCollections = new DynamicRecord({
			tableSlug: "_app_collections"
		});
		const Test1AppCollection = new AppCollections.Model(testAppCollection);
		await Test1AppCollection.save();
	});

	// Cleanup
	after(async function() {
		const col = await AppCollections.all();
		const promises = col.map((el) => {
			return el.destroy();
		});
		await Promise.all(promises);
	});

	// Data definitions (module specific)
	const schemaResponse = Object.freeze({
		tableName: "Test 1",
		tableSlug: "test_1",
		definition: {
			field_1: {
				type: "string",
				app_type: "wysiwyg",
				app_title: "Field 1"
			},
			field_2: {
				type: "string",
				app_type: "string",
				app_title: "Field 2"
			},
			field_3: {
				type: "string",
				app_type: "email",
				app_title: "Field 3"
			},
			field_4: {
				type: "array",
				app_type: "checkbox",
				app_title: "Field 4",
				app_values: {
					One: "one",
					Two: "two",
					Three: "three"
				}
			},
			field_5: {
				type: "string",
				app_type: "radio",
				app_title: "Field 5",
				app_values: {
					One: "one",
					Two: "two",
					Three: "three"
				}
			}
		},
		required: ["_uid", "_metadata"],
		description: "",
		jsonSchema: _.cloneDeep(testSchema)
	});

	const schemaRequest = Object.freeze({
		"tableName": "Test 3",
		"tableSlug": "test_3",
		"definition": {
			"field_1": {
				"type": "string",
				"app_type": "wysiwyg",
				"app_title": "Field 1"
			},
			"field_2": {
				"type": "string",
				"app_type": "string",
				"app_title": "Field 2"
			}
		}
	});


	/////////////////////////////////////////
	//             Test suites             //
	/////////////////////////////////////////
	describe("GET /api/schema", function() {
		beforeEach(function() {
			const promises = [];
			return Promise.all(promises);
		});

		afterEach(function() {
			const promises = [];
			return Promise.all(promises);
		});

		it("should return an array with one entry of collection schema as defined", function() {
			return chai.request(app).get("/api/schema").set("Content-Type", "application/json").set("Authorization", `Bearer ${token}`).then((res) => {
				assert.isArray(res.body, "response body is an array");
				assert.deepInclude(res.body, schemaResponse, "response body contains defined schema entry");
			});
		});
	});

	describe("GET /api/schema/:slug", function(){
		beforeEach(function() {
			const promises = [];
			return Promise.all(promises);
		});

		afterEach(function() {
			const promises = [];
			return Promise.all(promises);
		});

		it("should return collection schema object requested", function(){
			return chai.request(app).get("/api/schema/test_1").set("Content-Type", "application/json").set("Authorization", `Bearer ${token}`).then((res) => {
				assert.isObject(res.body, "response body is an object");
				assert.deepEqual(res.body, schemaResponse, "response body equals defined schema entry");
			});
		});
	});

	describe("POST /api/schema", function(){
		const AppCollections = new DynamicRecord({
			tableSlug: "_app_collections"
		});

		beforeEach(function() {
			const promises = [];
			return Promise.all(promises);
		});

		afterEach(function() {
			const promises = [];

			const Col = new DynamicRecord.DynamicSchema();
			promises.push(Col.read("test_3").then((col) => {
				return col.dropTable();
			}));
			promises.push(AppCollections.findBy({"_$id": "test_3"}).then((col) => {
				return col.destroy();
			}));

			return Promise.all(promises);
		});

		it("should create a new collection with defined schema", function(){
			return chai.request(app)
				.post("/api/schema")
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`)
				.send(schemaRequest)
				.then((res) => {
					return chai.request(app)
						.get("/api/schema/test_3")
						.set("Content-Type", "application/json")
						.set("Authorization", `Bearer ${token}`);
				}).then((res) => {
					assert.equal(res.body.tableName, schemaRequest.tableName);
					assert.equal(res.body.tableSlug, schemaRequest.tableSlug);
					assert.deepEqual(res.body.definition, schemaRequest.definition);
				});
		});
	});

	describe("POST /api/schema/:slug", function(){
		const AppCollections = new DynamicRecord({
			tableSlug: "_app_collections"
		});

		beforeEach(function() {
			const promises = [];
			return Promise.all(promises);
		});

		afterEach(function() {
			const promises = [];

			const Col = new DynamicRecord.DynamicSchema();
			promises.push(Col.read("test_3").then((col) => {
				return col.dropTable();
			}));
			promises.push(AppCollections.findBy({"_$id": "test_3"}).then((col) => {
				return col.destroy();
			}));

			return Promise.all(promises);
		});

		it("should edit the fields of the specified schema", function(){
			const modifiedSchema = _.cloneDeep(schemaRequest);
			modifiedSchema.definition.field_1.app_type = "text";
			modifiedSchema.definition.field_2.app_type = "radio";

			return chai.request(app)
				.post("/api/schema")
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`)
				.send(schemaRequest)
				.then((res) => {
					return chai.request(app)
						.post("/api/schema/test_3")
						.set("Content-Type", "application/json")
						.set("Authorization", `Bearer ${token}`)
						.send(modifiedSchema);
				}).then((res) => {
					assert.equal(res.body.tableName, modifiedSchema.tableName);
					assert.equal(res.body.tableSlug, modifiedSchema.tableSlug);
					assert.deepEqual(res.body.definition.field_1, modifiedSchema.definition.field_1);
					assert.deepEqual(res.body.definition.field_2, modifiedSchema.definition.field_2);
				});
		});
	});

	describe("DEL /api/schema/:slug", function(){
		const AppCollections = new DynamicRecord({
			tableSlug: "_app_collections"
		});

		const Col = new DynamicRecord.DynamicSchema();

		beforeEach(function() {
			const promises = [];

			promises.push(Col.createTable(test3Schema));

			return Promise.all(promises);
		});

		afterEach(function() {
			const promises = [];

			promises.push(Col.dropTable().catch((err) => {
				if(err.message === "ns not found"){
					return Promise.resolve();
				}else{
					return Promise.reject();
				}
			}));

			return Promise.all(promises);
		});

		it("should delete the collection specified", function(){
			return chai.request(app)
				.del("/api/schema/test_3")
				.set("Content-Type", "application/json")
				.set("Authorization", `Bearer ${token}`)
				.then((res) => {
					return AppCollections.findBy({"_$id": "test_3"}).then((col) => {
						assert.isNull(col, "schema not exist in database");
					});
				});
		});
	});
});