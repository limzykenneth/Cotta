const express = require("express");
const DynamicRecord = require("dynamic-record");

const router = express.Router();
const restrict = require("../../utils/middlewares/restrict.js");
const CottaError = require("../../utils/CottaError.js");
const Config = new DynamicRecord({
	tableSlug: "_configurations"
});

//-----------------------
// Route: {root}/api/config/...

router.use(restrict.toAdministrator);

// GET routes
// GET all configs
router.get("/", async function(req, res, next) {
	try{
		const configs = await Config.all();
		res.json(configs.data);
	}catch(err){
		next(err);
	}
});

// GET specified config
router.get("/:config_name", async function(req, res, next) {
	try{
		const config = await Config.findBy({config_name: req.params.config_name});
		res.json(config.data);
	}catch(err){
		next(err);
	}
});

// POST routes
// POST specific config (edit only)
router.post("/:config_name", async function(req, res, next) {
	try{
		const config = await Config.findBy({config_name: req.params.config_name});

		config.data.config_value = req.body.config_value;
		await config.save();

		res.json(config.data);
	}catch(err){
		next(err);
	}
});

module.exports = router;