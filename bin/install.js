#!/usr/bin/env node

console.log("\n🌱 This tool will help get you setup with your Cotta installation.");
console.log("🌱 Please run \"npm install\" if you haven't yet.");
console.log("🌱 Please make sure your database server is up and running already.\n");

async function install(){
	const inquirer = require("inquirer");
	const nanoid = require("nanoid");
	const _ = require("lodash");
	const databaseRegex = /^(?<schema>.+?):\/\/(?:(?<username>.+?)(?::(?<password>.+))?@)?(?<host>.+?)(?::(?<port>\d+?))?(?:\/(?<database>.+?))?(?:\?(?<options>.+?)?)?$/;

	// Ask for database details
	let answers = await inquirer.prompt([
		{
			type: "input",
			name: "database_url",
			message: "Please input the database connection URL (eg. mongodb://localhost/my_database):",
			validate: function(response){
				const regexResult = response.match(databaseRegex);
				if(regexResult === null){
					return `Invalid database connection URL: ${response}`;
				}else{
					return true;
				}
			}
		},
		{
			type: "input",
			name: "database_username",
			when: function(hash){
				const regexResult = hash.database_url.match(databaseRegex);

				return regexResult.groups.username ? false : true;
			}
		},
		{
			type: "password",
			name: "database_password",
			when: function(hash){
				const regexResult = hash.database_url.match(databaseRegex);

				return regexResult.groups.password ? false : true;
			}
		},
		{
			type: "input",
			name: "database_name",
			when: function(hash){
				const regexResult = hash.database_url.match(databaseRegex);

				return regexResult.groups.database ? false : true;
			}
		}
	]);

	// Init database
	const initDB = require("../node_modules/dynamic-record/tools/init.js").init;
	const regexResult = answers.database_url.match(databaseRegex);
	const dbschema = regexResult.groups.schema;
	const username = regexResult.groups.username || answers.database_username;
	const password = regexResult.groups.password || answers.database_password;
	const host = regexResult.groups.host;
	const port = regexResult.groups.port ? `:${regexResult.groups.port}` : "";
	const database = regexResult.groups.database || answers.database_name;
	let url = `${dbschema}://${username}:${password}@${host}${port}/${database}?${regexResult.groups.options || ""}`;

	try{
		await initDB(url);
		process.env.database_host = url;
		console.log(process.env.database_host);
	}catch(err){
		// NOTE: This catches mongodb only
		if(err.code === 11000){
			console.log("\n🌱 Duplicate entries of initalization tables exist. It may be because database has already been initialized or old tables in the database is causing a conflict. Exiting\n");
			process.exit(1);
		}else{
			console.error(err);
			process.exit(1);
		}
	}

	console.log("🌱 Creating default tables for Cotta...");

	const DynamicRecord = require("dynamic-record");
	const tableSchemas = [
		require("../schemas/_app_collections.schema.json"),
		require("../schemas/_users_auth.schema.json"),
		require("../schemas/file_upload.schema.json"),
		require("../schemas/_configurations.schema.json")
	];
	const schema = new DynamicRecord.DynamicSchema();

	const promises = _.map(tableSchemas, (tableSchema) => {
		const existing = new DynamicRecord.DynamicSchema();
		return existing.read(tableSchema.$id).then(() => {
			if(existing.tableName){
				console.log(`🌱 Table ${tableSchema.$id} already exist, skipping...`);
			}else{
				return schema.createTable(tableSchema);
			}
		});
	});
	await Promise.all(promises);

	console.log("🌱 Successfully created default tables for Cotta\n");

	// Initial configs
	answers = await inquirer.prompt([
		{
			type: "number",
			name: "bcrypt_hash_cost",
			message: "Please choose a cost factor for bcrypt:",
			default: 10
		},
		{
			type: "confirm",
			name: "allow_anonymous_tokens",
			message: "Do you want to allow anonymous tokens?",
			default: false
		},
		{
			type: "confirm",
			name: "allow_unauthorised",
			message: "Do you want to allow unauthorised access to the API? (Only GET routes)",
			default: false
		},
		{
			type: "confirm",
			name: "allow_signup",
			message: "Do you want to allow new user sign ups?",
			default: false
		},
		{
			type: "number",
			name: "upload_file_max",
			message: "What is the maximum allowed file size in bytes for uploads?",
			default: 1000000,
			validate: function(num){
				return num > 0;
			}
		},
		{
			type: "input",
			name: "upload_file_types",
			message: "What are the allowed file MIME types for uploads? (Please enter any MIME types seperated by a comma ',')",
			default: "image/jpeg,image/png",
			filter: function(input){
				if(input.trim().length === 0){
					return [];
				}else{
					return input.split(",");
				}
			}
		}
	]);

	const Configs = new DynamicRecord({
		tableSlug: "_configurations"
	});

	const bcryptCost = new Configs.Model({
		"config_name": "bcrypt_hash_cost",
		"config_value": answers.bcrypt_hash_cost,
		"config_type": "number"
	});
	const allowAnonymous = new Configs.Model({
		"config_name": "allow_anonymous_tokens",
		"config_value": answers.allow_anonymous_tokens,
		"config_type": "boolean"
	});
	const allowUnauthorised = new Configs.Model({
		"config_name": "allow_unauthorised",
		"config_value": answers.allow_unauthorised,
		"config_type": "boolean"
	});
	const allowSignup = new Configs.Model({
		"config_name": "allow_signup",
		"config_value": answers.allow_signup,
		"config_type": "boolean"
	});
	const uploadFileMax = new Configs.Model({
		"config_name": "upload_file_size_max",
		"config_value": answers.upload_file_max,
		"config_type": "number"
	});
	const uploadFileTypes = new Configs.Model({
		"config_name": "upload_file_accepted_MIME",
		"config_value": answers.upload_file_types,
		"config_type": "array"
	});
	const collection = new DynamicRecord.DynamicCollection(Configs.Model);

	try{
		let m = await Configs.findBy({"config_name": "bcrypt_hash_cost"});
		if(m === null){
			collection.push(bcryptCost);
		}else{
			console.log("🌱 Config \"bcrypt_hash_cost\" already exist, skipping...");
		}

		m = await Configs.findBy({"config_name": "allow_anonymous_tokens"});
		if(m === null){
			collection.push(allowAnonymous);
		}else{
			console.log("🌱 Config \"allow_anonymous_tokens\" already exist, skipping...");
		}

		m = await Configs.findBy({"config_name": "allow_unauthorised"});
		if(m === null){
			collection.push(allowUnauthorised);
		}else{
			console.log("🌱 Config \"allow_unauthorised\" already exist, skipping...");
		}

		m = await Configs.findBy({"config_name": "allow_signup"});
		if(m === null){
			collection.push(allowSignup);
		}else{
			console.log("🌱 Config \"allow_signup\" already exist, skipping...");
		}

		m = await Configs.findBy({"config_name": "upload_file_size_max"});
		if(m === null){
			collection.push(uploadFileMax);
		}else{
			console.log("🌱 Config \"upload_file_size_max\" already exist, skipping...");
		}

		m = await Configs.findBy({"config_name": "upload_file_accepted_MIME"});
		if(m === null){
			collection.push(uploadFileTypes);
		}else{
			console.log("🌱 Config \"upload_file_accepted_MIME\" already exist, skipping...");
		}

		await collection.saveAll();
	}catch(err){
		console.log(err);
		process.exit(1);
	}

	// Create admin user
	answers = await inquirer.prompt([
		{
			type: "input",
			name: "username",
			message: "Please choose an admin username for Cotta:",
			validate: function(value){
				return value.trim().length > 0 ? true : "Username cannot be empty";
			},
			filter: function(value){
				return value.trim();
			}
		},
		{
			type: "password",
			name: "password",
			message: "Please choose an admin password for Cotta:",
			validate: function(value){
				return value.trim().length > 0 ? true : "Password cannot be empty";
			},
			filter: function(value){
				return value.trim();
			}
		},
		{
			type: "password",
			name: "password_confirm",
			message: "Please confirm the password:",
			validate: function(value){
				return value.trim().length > 0 ? true : "Password cannot be empty";
			},
			filter: function(value){
				return value.trim();
			}
		}
	]);

	if(answers.password === answers.password_confirm){
		const bcrypt = require("bcrypt");
		const moment = require("moment");

		const Users = new DynamicRecord({
			tableSlug: "_users_auth"
		});

		const models = await Users.where({role: "administrator"});
		let hash;
		if(models.length === 0){
			hash = await bcrypt.hash(answers.password, 10);
		}else{
			console.log("\n🌱 Refusing to create new admin user where at least one already exist.\n");
		}

		if(hash){
			const user = new Users.Model({
				"username": answers.username,
				"hash": hash,
				"role": "administrator",
				"date_created": moment.utc().format()
			});
			await user.save();
		}
	}else{
		return Promise.reject(new Error("Passwords do not match"));
	}

	// Environment
	answers = await inquirer.prompt([
		{
			type: "list",
			name: "storage_strategy",
			message: "What is the storage strategy you are going to use for storing uploaded files?",
			choices: ["fs", "mongodb"]
		},
		{
			type: "input",
			name: "root_url",
			message: "What is the root URL for your backend site? (eg. https://example.com)",
			validate: function(value){
				return value.trim().length > 0 ? true : "Invalid URL";
			},
			filter: function(value){
				return value.trim();
			}
		},
		{
			type: "input",
			name: "jwt_secret",
			message: "JWT secret string, leave blank for random (recommended)",
			validate: function(value){
				return value.trim().length > 0 ? true : "Invalid URL";
			},
			filter: function(value){
				return value.trim();
			},
			default: () => nanoid()
		}
	]);

	const output =
`
# Database credentials
database_host=${dbschema}://${username}:[database password]@${host}${port}/${database}?${regexResult.groups.options || ""}

# The secret key used to sign your JWT tokens
JWT_SECRET=${answers.jwt_secret}

# File storage strategy
STORAGE_STRATEGY=${answers.storage_strategy}

# Root URL
ROOT_URL=${answers.root_url}
`;

	console.log("\n🌱 Please set the following in your enviroment variables.");
	console.log(output);

	console.log("\n🌱 Cotta is all setup and ready to go!\n");

	await DynamicRecord.closeConnection();
}

install().catch((e) => {
	console.error(e);
	process.exit(1);
});