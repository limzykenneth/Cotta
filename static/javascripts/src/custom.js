var $ = require("jquery");
var _ = require("lodash/core");
_.template = require("lodash/template");
require('whatwg-fetch');
var CharMessenger = require("./CharMessenger.js");

$(document).ready(function() {
	var message = new CharMessenger($(".message-box"));
	message.fadeOut();

	// Schema definition aids ------------------------------------------------------
	$("#page-content").on("click", ".schema-definition .schema-add", function(e) {
		var renderField = _.template($("#schema-creation-template").html());

		$(this).parents(".field").after(renderField());
		$("#page-content .schema-definition .field").each(function(i) {
			$(this).find(".name-field").attr("name", "name-" + i);
			$(this).find(".type-field").attr("name", "type-" + i);
		});
	});

	$("#page-content").on("click", ".schema-definition .schema-remove", function(e) {
		$(this).parents(".field").remove();
	});

	$("#page-content").on("change", ".schema-definition .field .type-field", function(){
		$(this).parent().siblings(".choices").remove();

		var index = $(this).attr("name").replace(/^type-(\d+?)$/, "$1");
		choicesTemplate = _.template($("#checkbox-options-template").html());

		if($(this).val() == "checkbox" || $(this).val() == "radio"){
			$(this).parents(".field").append(choicesTemplate({index: index}));
		}
	});

	// Schema definition submission -------------------------------------------------
	$("#page-content .schema-definition").submit(function(e) {
		e.preventDefault();

		var formData = new FormData($(this)[0]);
		var $submitBtn = $(this).find(".submit input");
		$submitBtn.attr("value", "Saving...").prop("disabled", true);
		fetch($(this).attr("action"), {
			method: "post",
			body: formData,
			credentials: "include"
		}).then(function(res){
			return res.json();
		}).then(function(data){
			if(data.status == "success"){
				// redirect somewhere else
				window.location.replace("/admin/collections");
			}else if(data.status == "failed" || data.status == "error"){
				message.showMessage(data.message);
			}else{
				throw new Error(data);
			}
			$submitBtn.attr("value", "Save").prop("disabled", false);
		}).catch(function(err){
			throw err;
		});
	});

	// Editor settings -------------------------------------------------------------
	$(".wysiwyg-editor").trumbowyg();

	// New model submission --------------------------------------------------------
	$("#page-content .model-form").submit(function(e) {
		var formData = new FormData($(this)[0]);
		e.preventDefault();

		var $submitBtn = $(this).find(".submit input");
		$submitBtn.attr("value", "Saving...").prop("disabled", true);

		fetch($(this).attr("action"), {
			method: "post",
			body: formData,
			credentials: "include"
		}).then(function(res){
			return res.json();
		}).then(function(data){
			if(data.status == "success"){
				// redirect somewhere else
				window.location.replace("/admin/collections");
			}
			$submitBtn.attr("value", "Save").prop("disabled", false);
		}).catch(function(err){
			console.log(JSON.stringify(err));
			$submitBtn.attr("value", "Save").prop("disabled", false);
		});
	});

	// JS elegant way of dealing with unauthorized access ---------------------------
	// Get requests
	$(".new-btn, .edit-btn").click(function(e) {
		e.preventDefault();
		var href = $(this).attr("href");

		fetch(href, {
			method: "get",
			credentials: "include"
		}).then(function(res){
			var contentType = res.headers.get("content-type");
			if(contentType && contentType.indexOf("application/json") !== -1){
				return res.json();
			}else{
				window.location.replace(href);
			}
		}).then(function(data){
			if(data.status == "error"){
				message.showMessage(data.message);
			}else{
				throw new Error(data);
			}
		}).catch(function(err){
			throw err;
		});
	});

	// POST requests
	$(".delete-form").submit(function(e){
		e.preventDefault();

		var href = $(this).attr("action");
		var formData = new FormData($(this)[0]);
		fetch(href, {
			method: "post",
			body: formData,
			credentials: "include"
		}).then(function(res){
			var contentType = res.headers.get("content-type");
			if(contentType && contentType.indexOf("application/json") !== -1){
				return res.json();
			}else if(res.status == 200){
				window.location.replace(res.url);
			}else{
				throw new Error(res);
			}
		}).then(function(data){
			if(data.status == "error"){
				message.showMessage(data.message);
			}else{
				throw new Error(data);
			}
		}).catch(function(err){
			throw err;
		});
	});
});