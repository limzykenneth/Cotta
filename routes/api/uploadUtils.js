// This file contains utility functions used by both upload.js
// and collections.js
const moment = require("moment");
const nanoid = require("nanoid");
const path = require("path");
const DynamicRecord = require("dynamic-record");

// const limits = {
// 	// Change to some integer value to limit file size
// 	fileSize: 1000000,
// 	acceptedMIME: [
// 		"audio/ogg",
// 		"image/jpeg"
// 	]
// };

// Initial values for limits, to be overwritten by database entries
// const limits = {
// 	fileSize: 0,
// 	acceptedMIME: []
// };
// const Config = new DynamicRecord({
// 	tableSlug: "_configurations"
// });

// let ready = Config.findBy({"config_name": "upload_file_size_max"}).then((m) => {
// 	if(m !== null){
// 		limits.fileSize = parseInt(m.data.config_value);
// 	}
// 	return Config.findBy({"config_name": "upload_file_accepted_MIME"});
// }).then((m) => {
// 	if(m !== null){
// 		limits.acceptedMIME = m.data.config_value;
// 	}
// 	return Promise.resolve(null);
// });

const utils = {
	processFileMetadata: function(file, req, limits){
		file.data.created_at = moment().format();
		file.data.modified_at = moment().format();
		file.data.file_owner = req.user.username;
		file.data.uploadExpire = moment().add(1, "hours").format();
		file.data.uid = nanoid(20);
		const fileExt = path.extname(file.data.file_name) || "";
		file.data.file_permalink = `${req.protocol}://${req.get("host")}/uploads/${file.data.uid}${fileExt}`;
		file.data.saved_path = null;
		if(!file.data.file_size){
			file.data.file_size = limits.fileSize;
		}
	},

	setFileEntryMetadata: function(entry, file, req, limits){
		// Model will save a reference to the uploaded file
		// The client will be responsible for uploading the file
		// so that the link saved in the model will work
		entry.uid = file.data.uid;
		entry.permalink = file.data.file_permalink;
		// File link will be write once only
		entry.upload_link = `${req.protocol}://${req.get("host")}/api/upload/${file.data.uid}`;
		entry.upload_expire = file.data.uploadExpire;
		return Promise.resolve(file);
	}
};

module.exports = utils;