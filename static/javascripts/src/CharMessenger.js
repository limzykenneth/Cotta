var $ = require("jquery");
var _ = require("lodash/core");

var CharMessenger = function($messageBox){
	this.$messageBox = $messageBox;
	this.timers = [];
};

CharMessenger.prototype.fadeOut = function(){
	var self = this;
	this.timers.push(setTimeout(function(){
		self.$messageBox.addClass("hide");

		self.timers.push(setTimeout(function(){
			self.$messageBox.removeClass("hide").find(".msg").empty();
		}, 501));
	}, 2000));
};


CharMessenger.prototype.showMessage = function(message){
	_.each(this.timers, function(el){
		clearTimeout(el);
	});
	this.timers = [];
	this.$messageBox.removeClass("hide").find(".msg").html(message);
	this.fadeOut();
};

module.exports = CharMessenger;