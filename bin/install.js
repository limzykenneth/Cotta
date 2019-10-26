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
			console.log("🌱 Creating default tables for Cotta...\n");
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
				}
			]);
		}).then((answers) => {
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
					return Promise.reject(new Error("Refusing to create new admin user where at least one already exist."));
				}
			}).then((hash) => {
				const user = new Users.Model({
					"username": answers.username,
					"hash": hash,
					"role": "administrator",
					"date_created": moment.utc().format()
				});
				return user.save();
			}).then(() => {
				return Users.closeConnection();
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