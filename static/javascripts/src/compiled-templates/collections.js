var Handlebars = require("handlebars");module.exports = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "	<div class=\"collection card\">\n		<h2><a href=\"/admin/collections/"
    + alias4(((helper = (helper = helpers.collectionSlug || (depth0 != null ? depth0.collectionSlug : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"collectionSlug","hash":{},"data":data}) : helper)))
    + "\">"
    + alias4(((helper = (helper = helpers.collectionName || (depth0 != null ? depth0.collectionName : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"collectionName","hash":{},"data":data}) : helper)))
    + "</a></h2>\n		<ul class=\"schema\">\n			<h3>Fields</h3>\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.fields : depth0),{"name":"each","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "		</ul>\n		<p><a class=\"edit-btn button\" href=\"/admin/collections/edit/"
    + alias4(((helper = (helper = helpers.collectionSlug || (depth0 != null ? depth0.collectionSlug : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"collectionSlug","hash":{},"data":data}) : helper)))
    + "\">Edit</a></p>\n	</div>\n";
},"2":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "				<li>"
    + alias4(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data}) : helper)))
    + ": "
    + alias4(((helper = (helper = helpers.type || (depth0 != null ? depth0.type : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"type","hash":{},"data":data}) : helper)))
    + "</li>\n";
},"4":function(container,depth0,helpers,partials,data) {
    return "	<p>No collections created yet. Perhaps you want to click <a href=\"/admin/collections/new\">here</a> to create a new collection?</p>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.data : depth0),{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.program(4, data, 0),"data":data})) != null ? stack1 : "");
},"useData":true});