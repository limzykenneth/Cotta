var $ = require("jquery");
var _ = require("lodash/core");
require('whatwg-fetch');

var template = require("./compiled-templates/collections.js");

var collectionsPage = {};

collectionsPage.populate = function($selector){
	var headers = new Headers({
		Authorization: "Bearer " + docCookies.getItem("jwt_token")
	});

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