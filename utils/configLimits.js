const DynamicRecord = require("dynamic-record");

const Config = new DynamicRecord({
	tableSlug: "_configurations"
});

function configLimits(){
	const limits = {
		fileSize: 0,
		acceptedMIME: []
	};
	const fileSize = Config.findBy({"config_name": "upload_file_size_max"});
	const fileMIME = Config.findBy({"config_name": "upload_file_accepted_MIME"});

	return Promise.all([fileSize, fileMIME]).then((result) => {
		if(result[0] !== null){
			limits.fileSize = parseInt(result[0].data.config_value);
		}

		if(result[1] !== null){
			limits.acceptedMIME = result[1].data.config_value;
		}

		return Promise.resolve(limits);
	});
}

module.exports = configLimits;