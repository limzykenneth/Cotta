var $ = require("jquery");
var _ = require("lodash/core");
var jwtdecode = require("jwt-decode");
require('whatwg-fetch');

var loginPage = {};

var submit = function(username, password){
	fetch("/api/tokens/generate_new_token", {
		headers: new Headers({
			"Content-Type": "application/json"
		}),
		method: "post",
		body: JSON.stringify({
			username: username,
			password: password
		})
	}).then(function(response){
		if(response.status == 200){
			return response.text();
		}else{
			throw new Error(response.status + " " + response.statusText);
		}
	}).then(function(data){
		var decoded = jwtdecode(data);
		var expireIn = decoded.exp - decoded.iat;

		docCookies.setItem("jwt_token", data, expireIn, null, null, false);
	}).catch(function(err){
		console.error(err);
	});
};

loginPage.submit = function($form){
	$form.submit(function(e){
		e.preventDefault();

		var username = $(this).find("input[name=username]").val();
		var password = $(this).find("input[name=password]").val();

		submit(username, password);
	});
};

loginPage.default = function(){
	if(docCookies.hasItem("jwt_token")){
		window.location.replace("/admin");
		return;
	}
};

module.exports = loginPage;