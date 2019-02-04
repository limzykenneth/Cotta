const logger = require("./logger.js");

// Middlewares that directly handles errors passed from the application
// Any new middleware added needs to be registered in app.js
const errors = {};

// catch 404 and forward to error handler
errors.notFound = function(req, res, next) {
	const err = new Error("Not Found");
	err.status = 404;
	next(err);
};

// Errors should be thrown only if the problem is unrecoverable,
// if recoverable, it should be caught and dealt with

// error handler
errors.general = function(err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get("env") === "development" ? err : {};

	let stackTrace = "";
	if(err.status !== 403 && err.message !== "jwt malformed"){
		stackTrace = "\n" + logger.errorsFormat.transform(err, {
			stack: true
		}).stack;
	}
	logger.error(
		`${err.status} ${err.message}${stackTrace}`
	);

	// render the error page
	res.status(err.status || 500);
	res.json({
		"title": err.title,
		"detail": err.message
	});
};

module.exports = errors;