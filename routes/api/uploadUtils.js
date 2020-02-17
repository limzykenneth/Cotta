// This file contains utility functions used by both upload.js
// and collections.js
const moment = require("moment");
const nanoid = require("nanoid");
const path = require("path");
const DynamicRecord = require("dynamic-record");

const utils = {
	processFileMetadata: function(file, req, limits){
		file.data.created_at = moment().format();
		file.data.modified_at = moment().format();
		file.data.file_owner = req.user.username;
		file.data.uploadExpire = moment().add(1, "hours").format();
		const fileExt = path.extname(file.data.file_name) || "";
		file.data.uid = nanoid(20) + fileExt;
		file.data.file_permalink = `<%= root %>/uploads/${file.data.uid}`;
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