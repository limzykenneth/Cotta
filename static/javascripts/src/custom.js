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
		if($(this).val() == "checkbox" || $(this).val() == "radio"){
			$(this).parents(".field").append($("#checkbox-options-template").html());
		}
	});


	$("#page-content .schema-definition").submit(function(e) {
		e.preventDefault();

		var rawData = $(this).serializeArray();
		var req = {
			collectionName: $(this).attr("data-collection-name") || rawData[0].value,
			fields: []
		};

		var choices = [];
		$(this).find("textarea").each(function(i){
			choices.push($(this).val());
		});
		var choicesIndex = 0;
		for(var i = rawData.length % 2; i < rawData.length; i = i + 2){
			var buffer = {};
			buffer.name = rawData[i].value;
			buffer.type = rawData[i+1].value;
			if(buffer.type == "checkbox" || buffer.type == "radio"){
				buffer.properties = {};
				var choiceList = choices[choicesIndex].split("\n");
				var choiceObject = {};

				// Extras to allow custom definitions of options values
				_.each(choiceList, function(el, i){
					var reg = [/^"(.+?)":"(.+?)"$/g, /^"(.+?)":(.+?)$/g, /^(.+?):"(.+?)"$/g, /^(.+?):(.+?)$/g];
					if(reg[0].test(el)){
						choiceObject[el.replace(reg[0], "$1")] = el.replace(reg[0], "$2");
					}else if(reg[1].test(el)){
						choiceObject[el.replace(reg[1], "$1")] = el.replace(reg[1], "$2");
					}else if(reg[2].test(el)){
						choiceObject[el.replace(reg[2], "$1")] = el.replace(reg[2], "$2");
					}else if(reg[3].test(el)){
						choiceObject[el.replace(reg[3], "$1")] = el.replace(reg[3], "$2");
					}else{
						choiceObject[el] = el;
					}
				});

				buffer.properties.choices = choiceObject;
				choicesIndex++;
			}
			req.fields.push(buffer);
		}

		var $submitBtn = $(this).find(".submit input");
		$submitBtn.attr("value", "Saving...").prop("disabled", true);
		fetch($(this).attr("action"), {
			method: "post",
			body: JSON.stringify(req),
			credentials: "include",
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json'
		    }
		}).then(function(res){
			return res.json();
		}).then(function(data){
			if(data.status == "success"){
				// redirect somewhere else
				window.location.href("/admin/collections");
			}else{
				$("#page-content .collection-creation .error-msg").text(data.reason).show().delay(2000).fadeOut(500);
				$submitBtn.attr("value", "Save").prop("disabled", false);
			}
		});
	});

	$(".wysiwyg-editor").trumbowyg();

	$("#page-content .model-creation .model-form").submit(function(e) {
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
				console.log("success");
				$submitBtn.attr("value", "Save").prop("disabled", false);
			}else{
				$submitBtn.attr("value", "Save").prop("disabled", false);
			}
		});
	});
});