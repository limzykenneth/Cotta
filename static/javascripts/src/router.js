var RouteRecognizer = require("route-recognizer");
var routeHandlers = require("./routeHandlers.js");

var router = new RouteRecognizer();

router.add([{path: "/admin/collections", handler: routeHandlers.collectionsPage}]);
router.add([{path: "/admin/collections/:collection_slug", handler: routeHandlers.collectionPage}]);

module.exports = router;