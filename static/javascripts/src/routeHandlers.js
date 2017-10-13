var collectionsPage = require("./collections.js");
var routeHandlers = {};

routeHandlers.collectionsPage = function(){
	collectionsPage.populate($("#page-content .collections-container .collections"));
};
routeHandlers.collectionPage = function(params){
	collectionSlug = params.collection_slug;

};

module.exports = routeHandlers;