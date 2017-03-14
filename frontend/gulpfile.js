var gulp = require("gulp"),
	gutil = require("gulp-util"),
    handlebars = require("gulp-compile-handlebars"),
    rename = require("gulp-rename"),
    less = require("gulp-less"),
    cleanCSS = require("gulp-clean-css"),
    autoprefixer = require("gulp-autoprefixer"),
    browserify = require("browserify"),
    source = require("vinyl-source-stream"),
    buffer = require("vinyl-buffer"),
    plumber = require("gulp-plumber"),
    uglifyjs = require("gulp-uglify"),
    surge = require("gulp-surge"),
    browserSync = require("browser-sync").create(),
    historyApiFallback = require('connect-history-api-fallback');

// Compilation tasks
var tasks = function(gulp, taskOp, plugins){
	gulp.task("handlebars", function(){
		var indexData = {
			index: true
		};

		var options = {
			ignorePartials: true,
			batch: [taskOp.dir + "src/views/partials", taskOp.dir + "src/views/partials/head"],
			helpers: {
				capitals : function(str){
	                return str.fn(this).toUpperCase();
	            },
	            titleCase: function(str){
	            	return str.fn(this).replace(/\w\S*/g, function(txt){
						return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
					});
	            },
	            ifEquals: function(a, b, opts){
	            	if(a == b){
				        return opts.fn(this);
	            	}else{
				        return opts.inverse(this);
				    }
	            }
			}
		};

		return gulp.src(taskOp.dir + "src/views/main.hbs")
			.pipe(plumber({
				errorHandler: onError
			}))
	        .pipe(handlebars(indexData, options))
	        .pipe(rename("index.html"))
	        .pipe(gulp.dest(taskOp.outDir));
	});

	gulp.task("stylesheets", function(){
		var lessOptions = {
			paths: [taskOp.dir + "src/stylesheets"]
		};

		var cleanCSSOptions = {};

		return gulp.src(taskOp.dir + "src/stylesheets/style.less")
			.pipe(plumber({
				errorHandler: onError
			}))
			.pipe(less(lessOptions))
			.pipe(autoprefixer())
			.pipe(gulp.dest(taskOp.outDir + "stylesheets"))
			.pipe(cleanCSS(cleanCSSOptions))
			.pipe(rename("style.min.css"))
			.pipe(gulp.dest(taskOp.outDir + "stylesheets"))
			.pipe(browserSync.stream());
	});

	gulp.task("javascripts", function(){
		var uglifyOptions = {
			mangle: {
				screw_ie8: true
			},
			compress: {
				screw_ie8: true
			}
		};

		return browserify(taskOp.dir + "src/javascripts/custom.js", {
			debug: true,
		})
	        .bundle()
	        .on("error", onError)
	        .pipe(plumber({
				errorHandler: onError
			}))
	        .pipe(source("main.js"))
	        .pipe(gulp.dest(taskOp.outDir + "javascripts/"))
	        .pipe(buffer())
	        .pipe(uglifyjs(uglifyOptions))
	        .pipe(rename("main.min.js"))
	        .pipe(gulp.dest(taskOp.outDir + "javascripts/"));
	});

	gulp.task("copy-libraries-js", function(){
		return gulp.src(taskOp.dir + "src/javascripts/vendor/*")
			.pipe(gulp.dest(taskOp.outDir + "javascripts/vendor"));
	});

	gulp.task("copy-css", function(){
		gulp.src(taskOp.dir + "src/stylesheets/fonts/*")
			.pipe(gulp.dest(taskOp.outDir + "stylesheets/fonts"));

		gulp.src(taskOp.dir + "src/stylesheets/img/*")
			.pipe(gulp.dest(taskOp.outDir + "stylesheets/img"));

		return gulp.src(taskOp.dir + "src/stylesheets/normalize.min.css")
			.pipe(gulp.dest(taskOp.outDir + "stylesheets"));
	});

	gulp.task("copy-images", function(){
		return gulp.src(taskOp.dir + "images/**/*")
			.pipe(gulp.dest(taskOp.outDir + "images"));
	});

	// Server
	gulp.task("server", ["default"], function(){
		browserSync.init({
	        server: taskOp.outDir,
	        middleware: [historyApiFallback()]
	    });

	    gulp.watch(taskOp.dir + "src/stylesheets/**/*.less", ["stylesheets"]);
	    gulp.watch(taskOp.dir + "src/stylesheets/(normalize.min.css|fonts/*|img/*)", ["copy-css"]);

	    gulp.watch(taskOp.dir + "src/javascripts/**/*.js", ["javascripts"]);
	    gulp.watch(taskOp.dir + "src/javascripts/vendor/*", ["copy-libraries-js"]);

	    gulp.watch(taskOp.dir + "src/views/**/*", ["handlebars"]);

	    gulp.watch(taskOp.dir + "images/**/*", ["copy-images"]);

	    gulp.watch(taskOp.outDir + "*.html").on("change", browserSync.reload);
	    gulp.watch(taskOp.outDir + "javascripts/**/*").on("change", browserSync.reload);
	    gulp.watch(taskOp.outDir + "stylesheets/(normalize.min.css|fonts/*|img/*)").on("change", browserSync.reload);
	    gulp.watch(taskOp.outDir + "responses/*").on("change", browserSync.reload);
	});


	// Deployment tasks
	gulp.task("deploy:dev", ["default"], function(){
		return surge({
	    	project: taskOp.outDir,         // Path to your static build directory
	    	domain: ""  // Your domain or Surge subdomain
		});
	});

	gulp.task("deploy:prod", ["default"], function(){
		return surge({
	    	project: taskOp.outDir,         // Path to your static build directory
	    	domain: ""  // Your domain or Surge subdomain
		});
	});

	gulp.task("static-files", ["copy-libraries-js", "copy-css", "copy-images"]);
	gulp.task("default", ["handlebars", "stylesheets", "javascripts", "static-files"]);
	gulp.task("deploy", ["deploy:dev"]);
};

module.exports = tasks;
// tasks(gulp, {
	// dir: "./",
	// outDir: "./dist"
// });

function onError(err){
	gutil.log(gutil.colors.red('Error (' + err.plugin + '): ' + err.message));
	this.emit("end");
}