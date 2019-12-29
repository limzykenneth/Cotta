const express = require("express");
const DynamicRecord = require("dynamic-record");

const router = express.Router();
const restrict = require("../../utils/middlewares/restrict.js");
const CottaError = require("../../utils/CottaError.js");
const Files = new DynamicRecord({
	tableSlug: "files_upload"
});
const storage = require("./storage");

//-----------------------
// Route: {root}/api/files/...
// Description:
// These routes works with the metadata of the uploaded files and can delete
// the files from their storage.

// NOTE: need refactor and testing

router.use(restrict.toEditor);

// GET all file metadata entries
router.get("/", function(req, res, next){
	Files.all().then((col) => {
		res.json(col.data);
	}).catch((err) => {
		next(err);
	});
});

// GET metadata entries specified by id
router.get("/:id", function(req, res, next){
	Files.findBy({"uid": req.params.id}).then((file) => {
		if(file !== null){
			res.json(file.data);
		}else{
			next(new CottaError("File does not exist", `The requested file with ID ${req.params.id} does not exist.`, 404));
		}
	}).catch((err) => {
		next(err);
	});
});

// DELETE the metadata along with the file
router.delete("/:id", function(req, res, next){
	Files.findBy({"uid": req.params.id}).then((file) => {
		if(file !== null){
			return Promise.all([
				storage.del(req.params.id),
				file.destroy()
			]).then(() => {
				res.json({"detail": `File "${req.params.id}" deleted.`});
			});
		}else{
			next(new CottaError("File does not exist", `The requested file with ID "${req.params.id}" does not exist.`, 404));
		}
	}).catch((err) => {
		next(err);
	});
});

module.exports = router;