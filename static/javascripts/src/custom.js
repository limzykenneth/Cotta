var $ = require("jquery");
var _ = require("lodash/core");
_.template = require("lodash/template");
require('whatwg-fetch');

$(document).ready(function() {
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
				// window.location.replace("/admin/collections");
			}else{
				$("#page-content .collection-creation .error-msg").text(data.reason).show().delay(2000).fadeOut(500);
			}
			$submitBtn.attr("value", "Save").prop("disabled", false);
		});
	});

	$(".wysiwyg-editor").trumbowyg();

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
				// window.location.replace("/admin/collections");
			}
			$submitBtn.attr("value", "Save").prop("disabled", false);
		}).catch(function(err){
			console.log(JSON.stringify(err));
			$submitBtn.attr("value", "Save").prop("disabled", false);
		});
	});
});