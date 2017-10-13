var $ = require("jquery");
var _ = require("lodash/core");
require('whatwg-fetch');

var template = require("./compiled-templates/collections.js");

var collectionsPage = {};

collectionsPage.populate = function($selector){
	// TEMP SOLUTION ------------------
	var headers = new Headers({
		Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluaXN0cmF0b3IiLCJpYXQiOjE1MDc2MzA5MDAsImV4cCI6MTUwODIzNTcwMH0.0DHKsxWKdtq0s-ylVYjWj4lms4niaItT2w9zhVlWWOk"
	});
	// --------------------------------

	fetch("/api/schema", {
		headers: headers
	}).then(function(response){
		if(response.status == 200){
			return response.json();
		}else{
			throw new Error(response.status + " " + response.statusText);
		}
	}).then(function(data){
		$selector.html(template({data: data}));
	}).catch(function(err){
		console.error(err);
	});
};

module.exports = collectionsPage;