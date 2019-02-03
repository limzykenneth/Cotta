const winston = require("winston");
const moment = require("moment");

const charLogger = new (winston.Logger)({
	colors:{
		error: "red",
		warn: "yellow",
		info: "black",
		verbose: "black",
		debug: "green",
		silly: "rainbow"
	},
	transports: [
		new (winston.transports.Console)({
			timestamp: function(){
				return moment.utc().format();
			},
			formatter: function(options) {
				// Return string will be passed to logger.
				return winston.config.colorize(options.level, "CHAR") + " " + options.timestamp() +" "+ winston.config.colorize(options.level, options.level.toUpperCase()) +" "+ (options.message ? options.message : "") +
				(options.meta && Object.keys(options.meta).length ? "\n\t"+ JSON.stringify(options.meta) : "" );
			},
			colorize: true,
			level: "info"
		}),
		new (winston.transports.File)({
			filename: "char-debug.log",
			json: false,
			timestamp: function(){
				return moment.utc().format();
			},
			formatter: function(options) {
				// Return string will be passed to logger.
				return options.timestamp() +" - "+ options.level.toUpperCase() +" "+ (options.message ? options.message : "") +
					(options.meta && Object.keys(options.meta).length ? "\n\t"+ JSON.stringify(options.meta) : "" );
			},
			level: "info"
		})
	]
});

if(process.env.NODE_ENV == "development"){
	charLogger.transports.console.level = "debug";
	charLogger.remove(charLogger.transports.file);
}else if(process.env.NODE_ENV == "production"){
	charLogger.transports.console.level = "info";
	charLogger.transports.console.file = "error";
}else if(process.env.NODE_ENV == "idiotic"){
	charLogger.transports.console.level = "silly";
	charLogger.remove(charLogger.transports.file);
}

module.exports = charLogger;