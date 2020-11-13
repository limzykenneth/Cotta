const DynamicRecord = require("dynamic-record");
const _ = require("lodash");
const testSchema = require("./json/test_1.schema.json");
const testAppCollection = require("./json/test_1_AppCollection.json");
const testData = Object.freeze(_.cloneDeep(require("./json/test_1_data.json")));
const {createDefaultTables, setConfigs, createDefaultUser} = require("../bin/install.js");

let AppCollections;
const TestSchema = new DynamicRecord.DynamicSchema();

before(async function(){
	await createDefaultTables(process.env.database_host, true);
	await setConfigs({
		bcrypt_hash_cost: 10,
		allow_anonymous_tokens: false,
		allow_unauthorised: false,
		allow_signup: false,
		upload_file_max: 400000,
		upload_file_types: ["image/jpeg", "image/png"]
	}, true);
	await createDefaultUser("admin", "admin", 10, true);

	const promises = [
		TestSchema.createTable(testSchema)
	];

	await Promise.all(promises);

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

	await Promise.all([
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

	const dropTestSchema = TestSchema.dropTable();

	return Promise.all([appCollectionsCleanup, dropTestSchema]).then(() => {
		DynamicRecord.closeConnection();
	});
});