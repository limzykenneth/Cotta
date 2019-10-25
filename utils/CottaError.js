function CottaError(title, message, status){
	this.name = "CottaError";
	this.title = title || "Unknown Error";
	this.message = message || "Unknown error occured.";
	this.status = status || 500;
	this.stack = (new Error()).stack;
}
CottaError.prototype = Object.create(Error.prototype);
CottaError.prototype.constructor = CottaError;

module.exports = CottaError;