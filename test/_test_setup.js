const DynamicRecord = require("dynamic-record");
const _ = require("lodash");
const testSchema = require("./json/test_1.schema.json");
const testAppCollection = require("./json/test_1_AppCollection.json");
const testData = Object.freeze(_.cloneDeep(require("./json/test_1_data.json")));
const testImageData = _.cloneDeep(require("./json/file_data.json"));
const {createDefaultTables, setConfigs, createDefaultUser} = require("../bin/install.js");

let AppCollections;
let FileUpload;
const TestSchema = new DynamicRecord.DynamicSchema();

before(async function(){
	await createDefaultTables(process.env.database_host, true);
	await setConfigs({
		bcrypt_hash_cost: 10,
		allow_anonymous_tokens: false,
		allow_unauthorised: false,
		allow_signup: false,
		upload_file_max: 1000000,
		upload_file_types: ["image/jpeg", "image/png"]
	}, true);
	await createDefaultUser("admin", "admin", 10, true);

	const promises = [
		TestSchema.createTable(testSchema)
	];

	await Promise.all(promises);

	FileUpload = new DynamicRecord({
		tableSlug: "files_upload"
	});
	AppCollections = new DynamicRecord({
		tableSlug: "_app_collections"
	});
	const Test1AppCollection = new AppCollections.Model(testAppCollection);

	const Test1 = new DynamicRecord({
		tableSlug: "test_1"
	});

	const col = _.map(testData, (el) => {
		return new Test1.Model(el);
	});

	files = new FileUpload.Model(testImageData);

	await Promise.all([
		files.save(),
		Test1AppCollection.save(),
		col[0].save().then(() => {
			col[1].save();
		})
	]);
});

after(function(){
	const appCollectionsCleanup = AppCollections.all().then((col) => {
		const promises = [];
		col.forEach((el) => {
			promises.push(el.destroy());
		});
		return Promise.all(promises);
	});

	const fileUploadCleanup = FileUpload.all().then((col) => {
		const promises = [];
		col.forEach((el) => {
			promises.push(el.destroy());
		});
		return Promise.all(promises);
	});

	const dropTestSchema = TestSchema.dropTable();

	return Promise.all([appCollectionsCleanup, fileUploadCleanup, dropTestSchema]).then(() => {
		FileUpload.closeConnection();
	});
});

// Reset database state after each test
afterEach(async function(){
	const Test1 = new DynamicRecord({
		tableSlug: "test_1"
	});

	const model = await Test1.findBy({"_uid": 3});
	if(model !== null){
		await model.destroy();
	}
});