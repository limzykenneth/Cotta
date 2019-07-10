const DynamicRecord = require("dynamic-record");
const _ = require("lodash");
const testSchema = require("./json/test_1.schema.json");
const testAppCollection = require("./json/test_1_AppCollection.json");

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
	return Promise.all(promises);
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

	return Promise.all([appCollectionsCleanup, fileUploadCleanup, dropTestSchema]);
});