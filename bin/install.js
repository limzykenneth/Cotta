#!/usr/bin/env node

console.log("\n🌱 This tool will help get you setup with your Cotta installation.");
console.log("🌱 Please run \"npm install\" if you haven't yet.");
console.log("🌱 Please make sure your database server is up and running already.\n");

try{
	require("dotenv").config();
	const inquirer = require("inquirer");
	const nanoid = require("nanoid");
	const _ = require("lodash");

	if(_.every(["mongo_server", "mongo_db_name", "mongo_user", "mongo_pass", "JWT_SECRET", "STORAGE_STRATEGY"], _.partial(_.has, process.env))){
		inquirer.prompt([
			{
				type: "confirm",
				name: "initDatabase",
				message: "Do you wish to initialize the database with DynamicRecord?",
				default: true
			}
		]).then((answers) => {
			if(answers.initDatabase){
				const mongoDBInit = require("../node_modules/dynamic-record/tools/init/mongodb.js");
				return mongoDBInit({
					username: process.env.mongo_user,
					password: process.env.mongo_pass,
					serverPath: process.env.mongo_server,
					database: process.env.mongo_db_name
				}).catch((err) => {
					if(err.code === 11000){
						console.log("\n🌱 Duplicate entries of initalization tables exist. It may be because database has already been initialized or old tables in the database is causing a conflict. Exiting\n");
						process.exit(1);
					}else{
						console.error(err);
						process.exit(1);
					}
				});
			}else{
				return Promise.resolve();
			}
		}).then(() => {
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

			return Promise.all(promises);
		}).then(() => {
			console.log("🌱 Successfully created default tables for Cotta\n");
			return inquirer.prompt([
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
					message: "Please choose an admin password for Cotta:",
					validate: function(value){
						return value.trim().length > 0 ? true : "Password cannot be empty";
					},
					filter: function(value){
						return value.trim();
					}
				}
			]);
		}).then((answers) => {
			if(answers.password === answers.password_confirm){
				const DynamicRecord = require("dynamic-record");
				const bcrypt = require("bcrypt");
				const moment = require("moment");

				const Users = new DynamicRecord({
					tableSlug: "_users_auth"
				});

				return Users.where({role: "administrator"}).then((models) => {
					if(models.length === 0){
						return bcrypt.hash(answers.password, 10);
					}else{
						console.log("\n🌱 Refusing to create new admin user where at least one already exist.\n");
						return Promise.resolve(false);
					}
				}).then((hash) => {
					if(hash !== false){
						const user = new Users.Model({
							"username": answers.username,
							"hash": hash,
							"role": "administrator",
							"date_created": moment.utc().format()
						});
						return user.save();
					}else{
						return Promise.resolve();
					}
				});
			}else{
				return Promise.reject(new Error("Passwords do not match"));
			}
		}).then(() => {
			return inquirer.prompt([
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
		}).then((answers) => {
			const DynamicRecord = require("dynamic-record");
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

			return Configs.findBy({"config_name": "bcrypt_hash_cost"}).then((m) => {
				if(m === null){
					collection.push(bcryptCost);
				}else{
					console.log("🌱 Config \"bcrypt_hash_cost\" already exist, skipping...");
				}
				return Configs.findBy({"config_name": "allow_anonymous_tokens"});

			}).then((m) => {
				if(m === null){
					collection.push(allowAnonymous);
				}else{
					console.log("🌱 Config \"allow_anonymous_tokens\" already exist, skipping...");
				}
				return Configs.findBy({"config_name": "allow_unauthorised"});
			}).then((m) => {
				if(m === null){
					collection.push(allowUnauthorised);
				}else{
					console.log("🌱 Config \"allow_unauthorised\" already exist, skipping...");
				}
				return Configs.findBy({"config_name": "allow_signup"});
			}).then((m) => {
				if(m === null){
					collection.push(allowSignup);
				}else{
					console.log("🌱 Config \"allow_signup\" already exist, skipping...");
				}

				return Configs.findBy({"config_name": "upload_file_size_max"});
			}).then((m) => {
				if(m === null){
					collection.push(uploadFileMax);
				}else{
					console.log("🌱 Config \"upload_file_size_max\" already exist, skipping...");
				}

				return Configs.findBy({"config_name": "upload_file_accepted_MIME"});
			}).then((m) => {
				if(m === null){
					collection.push(uploadFileTypes);
				}else{
					console.log("🌱 Config \"upload_file_accepted_MIME\" already exist, skipping...");
				}

				return collection.saveAll();
			}).then(() => {
				return Configs.closeConnection();
			});
		}).then(() => {
			console.log("\n🌱 Cotta is all setup and ready to go!\n");
		}).catch((err) => {
			console.log(err);
			process.exit(1);
		});
	}else{
		inquirer.prompt([
			{
				type: "input",
				name: "database_address",
				message: "What is your database server address? (eg. mongodb://localhost:27017)",
				validate: function(value){
					return value.trim().length > 0 ? true : "Invalid address";
				},
				filter: function(value){
					return value.trim();
				}
			},
			{
				type: "input",
				name: "database_username",
				message: "What is the username for your database server?",
				validate: function(value){
					return value.trim().length > 0 ? true : "Invalid username";
				},
				filter: function(value){
					return value.trim();
				}
			},
			{
				type: "input",
				name: "database_name",
				message: "What is the name for your database?",
				validate: function(value){
					return value.trim().length > 0 ? true : "Invalid database name";
				},
				filter: function(value){
					return value.trim();
				}
			},
			{
				type: "list",
				name: "storage_strategy",
				message: "What is the storage strategy you are going to use for storing uploaded files?",
				choices: ["fs", "mongodb"]
			}
		]).then((answers) => {
			const jwtSecret = nanoid();
			const output =
			// NOTE: Address needs to strip protocol
`
# Database credentials
mongo_server=${answers.database_address}
mongo_db_name=${answers.database_name}
mongo_user=${answers.database_username}
mongo_pass=(your_database_password)

# The secret key used to sign your JWT tokens
JWT_SECRET=${jwtSecret}

# File storage strategy
STORAGE_STRATEGY=${answers.storage_strategy}
`;
			console.log("\n🌱 Please set the following in your enviromental variables before running this script again:");
			console.log(output);
		});
	}

}catch(e){
	console.log(e);
}