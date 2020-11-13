const DynamicRecord = require("dynamic-record");
const _ = require("lodash");
const {createDefaultTables, setConfigs, createDefaultUser} = require("../bin/install.js");


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
});

after(async function(){
	DynamicRecord.closeConnection();
});