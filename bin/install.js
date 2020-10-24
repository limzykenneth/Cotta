#!/usr/bin/env node

async function install(){
	console.log("\n🌱 This tool will help get you setup with your Cotta installation.");
	console.log("🌱 Please run \"npm install\" if you haven't yet.");
	console.log("🌱 Please make sure your database server is up and running already.\n");

	try{
		const inquirer = require("inquirer");
		const nanoid = require("nanoid");
		const databaseRegex = /^(?<schema>.+?):\/\/(?:(?<username>.+?)(?::(?<password>.+))?@)?(?<host>.+?)(?::(?<port>\d+?))?(?:\/(?<database>.+?))?(?:\?(?<options>.+?)?)?$/;

		// Ask for database details
		let answers = await inquirer.prompt([
			{
				type: "input",
				name: "database_url",
				prefix: "🌱",
				message: "Please input the database connection URL (eg. mongodb://localhost/my_database):",
				validate: function(response){
					const regexResult = response.match(databaseRegex);
					if(regexResult === null){
						return `Invalid database connection URL: ${response}`;
					}else{
						return true;
					}
				},
				filter: function(value){
					return value.trim();
				}
			},
			{
				type: "input",
				name: "database_username",
				prefix: "🌱",
				when: function(hash){
					const regexResult = hash.database_url.match(databaseRegex);

					return regexResult.groups.username ? false : true;
				},
				filter: function(value){
					return value.trim();
				}
			},
			{
				type: "password",
				name: "database_password",
				prefix: "🌱",
				when: function(hash){
					const regexResult = hash.database_url.match(databaseRegex);

					return regexResult.groups.password ? false : true;
				}
			},
			{
				type: "input",
				name: "database_name",
				prefix: "🌱",
				when: function(hash){
					const regexResult = hash.database_url.match(databaseRegex);

					return regexResult.groups.database ? false : true;
				},
				filter: function(value){
					return value.trim();
				}
			}
		]);

		// Init database
		const regexResult = answers.database_url.match(databaseRegex);
		const dbschema = regexResult.groups.schema;
		const username = regexResult.groups.username || answers.database_username;
		const password = regexResult.groups.password || answers.database_password;
		const host = regexResult.groups.host;
		const port = regexResult.groups.port ? `:${regexResult.groups.port}` : "";
		const database = regexResult.groups.database || answers.database_name;
		let url = `${dbschema}://${username}:${password}@${host}${port}/${database}?${regexResult.groups.options || ""}`;

		await createDefaultTables(url);

		// Initial configs
		answers = await inquirer.prompt([
			{
				type: "number",
				name: "bcrypt_hash_cost",
				prefix: "🌱",
				message: "Please choose a cost factor for bcrypt:",
				default: 10
			},
			{
				type: "confirm",
				name: "allow_anonymous_tokens",
				prefix: "🌱",
				message: "Do you want to allow anonymous tokens?",
				default: false
			},
			{
				type: "confirm",
				name: "allow_unauthorised",
				prefix: "🌱",
				message: "Do you want to allow unauthorised access to the API? (Only GET routes)",
				default: false
			},
			{
				type: "confirm",
				name: "allow_signup",
				prefix: "🌱",
				message: "Do you want to allow new user sign ups?",
				default: false
			},
			{
				type: "number",
				name: "upload_file_max",
				prefix: "🌱",
				message: "What is the maximum allowed file size in bytes for uploads?",
				default: 1000000,
				validate: function(num){
					return num > 0;
				}
			},
			{
				type: "input",
				name: "upload_file_types",
				prefix: "🌱",
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

		await setConfigs(answers);
		const bcryptCost = answers.bcrypt_hash_cost;

		// Create admin user
		answers = await inquirer.prompt([
			{
				type: "input",
				name: "username",
				prefix: "🌱",
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
				prefix: "🌱",
				message: "Please choose an admin password for Cotta:",
				validate: function(value){
					return value.length > 0 ? true : "Password cannot be empty";
				},
				filter: function(value){
					return value;
				}
			},
			{
				type: "password",
				name: "password_confirm",
				prefix: "🌱",
				message: "Please confirm the password:",
				validate: function(value, hash){
					if(value.length <= 0){
						return "Password cannot be empty";
					}else if(value !== hash.password){
						return "Passwords do not match";
					}else{
						return true;
					}
				},
				filter: function(value){
					return value;
				}
			}
		]);

		await createDefaultUser(answers.username, answers.password, bcryptCost);

		// Add cotta field to package.json

		// Environment
		answers = await inquirer.prompt([
			{
				type: "list",
				name: "storage_strategy",
				prefix: "🌱",
				message: "What is the storage strategy you are going to use for storing uploaded files?",
				choices: ["fs", "mongodb"]
			},
			{
				type: "input",
				name: "mongodb_url",
				prefix: "🌱",
				message: "Please enter the full URL of the MongoDB database (eg. http://username@localhost/mydatabase):",
				when: function(hash){
					return hash.storage_strategy === "mongodb";
				},
				validate: function(val){
					const regexResult = val.match(databaseRegex);
					if(regexResult.groups.schema !== "mongodb" || regexResult.groups.schema !== "mongodb+srv"){
						return true;
					}

					return "Invalid MongoDB URL";
				},
				filter: function(val){
					return val.trim();
				}
			},
			{
				type: "username",
				name: "mongodb_username",
				prefix: "🌱",
				message: "Please enter the MongoDB database user password:",
				when: function(hash){
					if(hash.storage_strategy === "mongodb"){
						const regexResult = hash.mongodb_url.match(databaseRegex);

						return regexResult.groups.username ? false : true;
					}else{
						return false;
					}
				},
				filter: function(val){
					return val.trim();
				}
			},
			{
				type: "input",
				name: "mongodb_name",
				prefix: "🌱",
				when: function(hash){
					if(hash.storage_strategy === "mongodb"){
						const regexResult = hash.mongodb_url.match(databaseRegex);

						return regexResult.groups.database ? false : true;
					}else{
						return false;
					}
				},
				filter: function(value){
					return value.trim();
				}
			},
			{
				type: "input",
				name: "root_url",
				prefix: "🌱",
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
				prefix: "🌱",
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

		let mongodbFS = "";
		if(answers.storage_strategy === "mongodb"){
			const mongoRegexResult = answers.mongodb_url.match(databaseRegex);
			const mongoProtocol = mongoRegexResult.groups.schema;
			const mongoUsername = mongoRegexResult.groups.username || answers.database_username;
			const mongoHost = mongoRegexResult.groups.host;
			const mongoPort = mongoRegexResult.groups.port ? `:${mongoRegexResult.groups.port}` : "";
			const mongoDatabase = mongoRegexResult.groups.database || answers.database_name;
			mongodbFS = `mongodb_url=${mongoProtocol}://${mongoUsername}:[MongoDB password]@${mongoHost}${mongoPort}/${mongoDatabase}?${mongoRegexResult.groups.options || ""}`;
		}
		const output =
`
# Database credentials
database_host=${dbschema}://${username}:[database password]@${host}${port}/${database}?${regexResult.groups.options || ""}

# The secret key used to sign your JWT tokens
JWT_SECRET=${answers.jwt_secret}

# File storage strategy
STORAGE_STRATEGY=${answers.storage_strategy}
${mongodbFS}

# Root URL
ROOT_URL=${answers.root_url}
`;

		console.log("\n🌱 Please set the following in your enviroment variables.");
		console.log(output);

		console.log("\n🌱 Cotta is all setup and ready to go!\n");

		await closeConnection();

	}catch(err){
		console.error(err);
		process.exit(1);
	}
}

async function createDefaultTables(url, silent=false){
	// Initialize database
	const initDB = require("../node_modules/dynamic-record/tools/init.js").init;

	try{
		await initDB(url);
		process.env.database_host = url;
	}catch(err){
		// NOTE: This catches mongodb only
		if(err.code === 11000){
			if(!silent) console.log("\n🌱 Duplicate entries of initalization tables exist. It may be because database has already been initialized or old tables in the database is causing a conflict. Exiting\n");
			process.exit(1);
		}else{
			console.error(err);
			process.exit(1);
		}
	}

	// Create Cotta specific default tables
	const DynamicRecord = require("dynamic-record");
	const Bluebird = require("bluebird");
	const tableSchemas = [
		require("../schemas/_app_collections.schema.json"),
		require("../schemas/_users_auth.schema.json"),
		require("../schemas/file_upload.schema.json"),
		require("../schemas/_configurations.schema.json")
	];

	if(!silent) console.log("🌱 Creating default tables for Cotta...");

	await Bluebird.mapSeries(tableSchemas, async (tableSchema) => {
		const existing = new DynamicRecord.DynamicSchema();
		await existing.read(tableSchema.$id);
		if(existing.tableName){
			if(!silent) console.log(`🌱 Table ${tableSchema.$id} already exist, skipping...`);
		}else{
			return existing.createTable(tableSchema);
		}
	});

	if(!silent) console.log("🌱 Successfully created default tables for Cotta\n");
}

async function setConfigs(configs, silent=false){
	const DynamicRecord = require("dynamic-record");
	const _ = require("lodash");

	const Configs = new DynamicRecord({
		tableSlug: "_configurations"
	});

	const bcryptCost = new Configs.Model({
		"config_name": "bcrypt_hash_cost",
		"config_value": _.isNumber(configs.bcrypt_hash_cost) ? configs.bcrypt_hash_cost : 10,
		"config_type": "number"
	});
	const allowAnonymous = new Configs.Model({
		"config_name": "allow_anonymous_tokens",
		"config_value": _.isBoolean(configs.allow_anonymous_tokens) ? configs.allow_anonymous_tokens : false,
		"config_type": "boolean"
	});
	const allowUnauthorised = new Configs.Model({
		"config_name": "allow_unauthorised",
		"config_value": _.isBoolean(configs.allow_unauthorised) ? configs.allow_unauthorised : false,
		"config_type": "boolean"
	});
	const allowSignup = new Configs.Model({
		"config_name": "allow_signup",
		"config_value": _.isBoolean(configs.allow_signup) ? configs.allow_signup : false,
		"config_type": "boolean"
	});
	const uploadFileMax = new Configs.Model({
		"config_name": "upload_file_size_max",
		"config_value": _.isNumber(configs.upload_file_max) ? configs.upload_file_max : 1000000,
		"config_type": "number"
	});
	const uploadFileTypes = new Configs.Model({
		"config_name": "upload_file_accepted_MIME",
		"config_value": Array.isArray(configs.upload_file_types) ? configs.upload_file_types : [],
		"config_type": "array"
	});
	const collection = new DynamicRecord.DynamicCollection(Configs.Model);

	let m = await Configs.findBy({"config_name": "bcrypt_hash_cost"});
	if(m === null){
		collection.push(bcryptCost);
	}else{
		if(!silent) console.log("🌱 Config \"bcrypt_hash_cost\" already exist, skipping...");
	}

	m = await Configs.findBy({"config_name": "allow_anonymous_tokens"});
	if(m === null){
		collection.push(allowAnonymous);
	}else{
		if(!silent) console.log("🌱 Config \"allow_anonymous_tokens\" already exist, skipping...");
	}

	m = await Configs.findBy({"config_name": "allow_unauthorised"});
	if(m === null){
		collection.push(allowUnauthorised);
	}else{
		if(!silent) console.log("🌱 Config \"allow_unauthorised\" already exist, skipping...");
	}

	m = await Configs.findBy({"config_name": "allow_signup"});
	if(m === null){
		collection.push(allowSignup);
	}else{
		if(!silent) console.log("🌱 Config \"allow_signup\" already exist, skipping...");
	}

	m = await Configs.findBy({"config_name": "upload_file_size_max"});
	if(m === null){
		collection.push(uploadFileMax);
	}else{
		if(!silent) console.log("🌱 Config \"upload_file_size_max\" already exist, skipping...");
	}

	m = await Configs.findBy({"config_name": "upload_file_accepted_MIME"});
	if(m === null){
		collection.push(uploadFileTypes);
	}else{
		if(!silent) console.log("🌱 Config \"upload_file_accepted_MIME\" already exist, skipping...");
	}

	await collection.saveAll();
}

async function createDefaultUser(username, password, bcryptCost, silent=false){
	const DynamicRecord = require("dynamic-record");
	const bcrypt = require("bcrypt");
	const moment = require("moment");

	const Users = new DynamicRecord({
		tableSlug: "_users_auth"
	});

	const models = await Users.where({role: "administrator"});
	let hash;
	if(models.length === 0){
		hash = await bcrypt.hash(password, bcryptCost);
	}else{
		if(!silent) console.log("\n🌱 Refusing to create new admin user where at least one already exist.\n");
	}

	if(hash){
		const user = new Users.Model({
			"username": username,
			"hash": hash,
			"role": "administrator",
			"date_created": moment.utc().format()
		});
		await user.save();
	}
}

async function closeConnection(){
	const DynamicRecord = require("dynamic-record");
	await DynamicRecord.closeConnection();
}

if(require.main === module){
	install();
}else{
	module.exports = {
		createDefaultTables,
		setConfigs,
		createDefaultUser,
		closeConnection,
		install
	};
}