function createSocketConnection(){
	var socket = io("/char-message");

	socket.on("message", function(data){
		$(".message-box .msg").html(data.message);

		setTimeout(function(){
			$(".message-box").addClass("hide");

			setTimeout(function(){
				$(".message-box").removeClass("hide").find(".msg").html("");
			}, 501);
		}, 2000);
	});
}

module.exports = createSocketConnection;