function CharError(title, message, status){
	this.name = "CharError";
	this.title = title || "Unknown Error";
	this.message = message || "Unknown error occured.";
	this.status = status || 500;
	this.stack = (new Error()).stack;
}
CharError.prototype = Object.create(Error.prototype);
CharError.prototype.constructor = CharError;

module.exports = CharError;