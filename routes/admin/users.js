const _ = require("lodash");
const express = require("express");
const router = express.Router();
const path = require("path");
const connect = require("../../utils/database.js");
const restricted = require("../../utils/middlewares/restrict.js");

// Setting locals
router.use(function(req, res, next){
	res.locals.title = "Users";
	next();
});

router.use(restricted.toAdministrator);

// Render list of all users
router.get("/", function(req, res){
	connect.then(function(db){
		db.collection("_users_auth").find().toArray(function(err, users){
			_.each(users, function(user, i){
				if(typeof user.models == "undefined" || typeof user.models.length == "undefined"){
					user.modelsCount = 0;
				}else{
					user.modelsCount = user.models.length;
				}
			});
			res.render("users", {users: users});
		});
	});
});

// Render info of user with specified ID
router.get("/:id", function(req, res){
	connect.then(function(db){
		db.collection("_users_auth").findOne({username: req.params.id}, function(err, user){
			var data = user;
			user.modelLinks = [];
			_.each(user.models, function(el, i){
				var col = el.replace(/^(.+?)\.(.+?)$/, "$1");
				var id = el.replace(/^(.+?)\.(.+?)$/, "$2");
				user.modelLinks[i] = {
					name: `Collection: ${col}, ID: ${id}`,
					link: `/admin/collections/${col}/${id}`,
					collectionSlug: col,
					_uid: id
				};
			});

			res.render("user", data);
		});
	});
});

// Delete user with specified ID
router.post("/:id", function(req, res, next){
	if(req.body._method == "delete"){
		if(req.params.id !== req.session.user.username){
			connect.then(function(db){
				db.collection("_users_auth").deleteOne({username: req.params.id}, function(err){
					if(err) throw err;

					db.listCollections().toArray(function(err, result){
						result = _.filter(result, function(el){
							return !/^_/.test(el.name);
						});

						var modelEdits = [];
						_.each(result, function(el){
							modelEdits.push(db.collection(el.name)
							  .updateMany({"_metadata.created_by": req.params.id}, {$set: {"_metadata.created_by": "admin"}}));
						});

						Promise.all(modelEdits).then(function(){
							res.locals.message = "Success!";
							res.redirect("/admin/users");
						}).catch(function(err){
							if(err) throw err;
						});
					});
				});
			});
		}else{
			res.json({
				status: "failed",
				message: "Are you trying to delete your account? Try the <a href='/admin/account'>account</a> page."
			});
		}
	}else{
		next();
	}
});

// Edit info of user with specified ID
router.post("/:id", function(req, res, next){
	if(req.body.user_role){
		connect.then(function(db){
			db.collection("_users_auth").updateOne({username: req.params.id}, {$set: {role: req.body.user_role}},function(err){
				if(err) throw err;

				res.locals.message = "Success!";
				res.redirect(`/admin/users/${req.params.id}`);
			});
		});
	}else{
		next();
	}
});

module.exports = router;