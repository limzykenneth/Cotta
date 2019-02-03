const winston = require("winston");

const logger = winston.createLogger({
	transports: [
		new winston.transports.Console({
			format: winston.format.combine(
				winston.format.simple()
			)
		})
	]
});
logger.stream = {
	write: function(message, encoding){
		logger.info(message.trim());
	}
};
logger.errorsFormat = winston.format.errors();

module.exports = logger;