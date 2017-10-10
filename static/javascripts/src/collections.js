var $ = require("jquery");
var _ = require("lodash/core");
require('whatwg-fetch');

var template = require("./compiled-templates/collections.js");

var collectionPage = {};

collectionPage.populate = function(){
	fetch("/api/collections/test_1").then(function(response){
		if(response.status == 200){
			return response.json();
		}else{
			throw new Error(response.status + " " + response.statusText);
		}
	}).then(function(data){
		console.log(data);
	}).catch(function(err){
		console.error(err);
	});
};

module.exports = collectionPage;