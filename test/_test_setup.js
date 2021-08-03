// A .env file need to be in the test folder containing database_host key
const path = require("path");
require("dotenv").config({path: path.join(__dirname, ".env")});

const DynamicRecord = require("dynamic-record");
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