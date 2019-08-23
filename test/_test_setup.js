const DynamicRecord = require("dynamic-record");
const _ = require("lodash");
const testSchema = require("./json/test_1.schema.json");
const testAppCollection = require("./json/test_1_AppCollection.json");
const testData = Object.freeze(_.cloneDeep(require("./json/test_1_data.json")));

const AppCollections = new DynamicRecord({
	tableSlug: "_app_collections"
});
const FileUpload = new DynamicRecord({
	tableSlug: "file_upload"
});
const TestSchema = new DynamicRecord.DynamicSchema();

before(function(){
	const Test1AppCollection = new AppCollections.Model(testAppCollection);
	const promises = [TestSchema.createTable(testSchema), Test1AppCollection.save()];

	return Promise.all(promises).then(() => {
		const Test1 = new DynamicRecord({
			tableSlug: "test_1"
		});

		const col = _.map(testData, (el) => {
			return new Test1.Model(el);
		});

		const p = [];
		// Saving sequentially as DynamicRecord can't handle parallel saving
		// of collections with auto incrementing index yet
		return col[0].save().then(() => {
			col[1].save();
		});
	});
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
afterEach(function(){
	const Test1 = new DynamicRecord({
		tableSlug: "test_1"
	});
	const Counters = new DynamicRecord({
		tableSlug: "_counters"
	});

	return Test1.findBy({"_uid": 3}).then((model) => {
		if(model !== null){
			return model.destroy();
		}else{
			return Promise.resolve();
		}
	});
});