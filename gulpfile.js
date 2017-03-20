var gulp = require("gulp");
var rename = require("gulp-rename");
var nodemon = require("gulp-nodemon");
var plumber = require("gulp-plumber");
var browserify = require("browserify"),
	source = require("vinyl-source-stream"),
    buffer = require("vinyl-buffer"),
    uglifyjs = require("gulp-uglify");

var less = require("gulp-less"),
	cleanCSS = require("gulp-clean-css"),
    autoprefixer = require("gulp-autoprefixer");

var path = require("path");
var minimist = require("minimist");
var argv = minimist(process.argv.slice(2));

if(argv.f){
	require("./frontend/gulpfile.js")(gulp, {
		dir: "./frontend/",
		outDir: "./public/"
	});
}else{
	gulp.task("server", ["default"], function(){
		nodemon({
			verbose: argv.v || false,
			script: "./bin/www",
			ignore: ["frontend/**/*", "public/**/*", "static/**/*"]
		});

		gulp.watch("./static/stylesheets/src/*", ["stylesheets"]);
		gulp.watch("./static/javascripts/src/*", ["javascripts"]);
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

		return browserify(path.join(__dirname, "static/javascripts/src/custom.js"), {
			debug: true,
		})
	        .bundle()
	        .on("error", onError)
	        .pipe(plumber({
				errorHandler: onError
			}))
	        .pipe(source("main.js"))
	        .pipe(gulp.dest(path.join(__dirname, "static/javascripts/")))
	        .pipe(buffer())
	        .pipe(uglifyjs(uglifyOptions))
	        .pipe(rename("main.min.js"))
	        .pipe(gulp.dest(path.join(__dirname, "static/javascripts/")));
	});

	gulp.task("stylesheets", function(){
		var lessOptions = {
			paths: ["./static/stylesheets/src"]
		};

		var cleanCSSOptions = {};

		return gulp.src(path.join(__dirname, "static/stylesheets/src/style.less"))
			.pipe(plumber({
				errorHandler: onError
			}))
			.pipe(less(lessOptions))
			.pipe(autoprefixer())
			.pipe(gulp.dest(path.join(__dirname, "static/stylesheets")))
			.pipe(cleanCSS(cleanCSSOptions))
			.pipe(rename("style.min.css"))
			.pipe(gulp.dest(path.join(__dirname, "static/stylesheets")));
	});

	gulp.task("default", ["stylesheets", "javascripts"]);
}


function onError(err){
	gutil.log(gutil.colors.red('Error (' + err.plugin + '): ' + err.message));
	this.emit("end");
}