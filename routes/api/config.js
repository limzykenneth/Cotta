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
router.get("/", function(req, res, next) {
	Config.all().then((configs) => {
		res.json(configs.data);
	});
});

// GET specified config
router.get("/:config_name", function(req, res, next) {
	Config.findBy({config_name: req.params.config_name}).then((config) => {
		res.json(config.data);
	});
});

// POST routes
// POST specific config (edit only)
router.post("/:config_name", function(req, res, next) {
	Config.findBy({config_name: req.params.config_name}).then((config) => {
		config.data.config_value = req.body.config_value;
		return config.save();
	}).then((config) => {
		res.json(config.data);
	});
});

module.exports = router;