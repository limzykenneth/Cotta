module.exports = function(io){
	return io.of("/char-message");
		// .on("connection", function(socket){
		// 	console.log("A user is connected to Char messaging");
		// 	socket.emit("message", {"message": "hello derp"});
		// })
};