var collectionsPage = require("./collections.js");
var loginPage = require("./login.js");
var routeHandlers = {};

routeHandlers.collectionsPage = function(){
	collectionsPage.populate($("#page-content .collections-container .collections"));
};
routeHandlers.collectionPage = function(params){
	collectionSlug = params.collection_slug;
};


routeHandlers.loginPage = function(){
	loginPage.default();
	loginPage.submit($("#page-content .login-form form"));
};

module.exports = routeHandlers;