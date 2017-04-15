const gulp = require("gulp");
const rename = require("gulp-rename");
const nodemon = require("gulp-nodemon"),
	  browserSync = require('browser-sync');
const plumber = require("gulp-plumber");
const browserify = require("browserify"),
	  source = require("vinyl-source-stream"),
      buffer = require("vinyl-buffer"),
      uglifyjs = require("gulp-uglify");
const mocha = require("gulp-mocha");
const gutil = require("gulp-util");

const less = require("gulp-less"),
	  cleanCSS = require("gulp-clean-css"),
      autoprefixer = require("gulp-autoprefixer");

const path = require("path");
const minimist = require("minimist");
var argv = minimist(process.argv.slice(2));

if(argv.f){
	require("./frontend/gulpfile.js")(gulp, {
		dir: "./frontend/",
		outDir: "./public/"
	});
}else{
	// Run server
	gulp.task("nodemon", function(cb){
		var started = false;

		return nodemon({
			verbose: argv.verbose || false,
			script: "./bin/www",
			ignore: ["frontend/**/*", "public/**/*", "static/**/*"]
		}).on("start", function(){
			if(!started){
				cb();
				started = true;
			}
		});
	});

	gulp.task("browser-sync", ["nodemon"], function(){
		browserSync.init({
			proxy: "http://localhost:8080",
			files: ["static/!(src)/*", "views/**/*"],
			port: "8888"
		});
	});

	gulp.task("server", ["default", "browser-sync"], function(){
		gulp.watch("./static/stylesheets/src/*", ["stylesheets"]);
		gulp.watch("./static/javascripts/src/*", ["javascripts"]);
	});

	// Build static source
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
			.pipe(gulp.dest(path.join(__dirname, "static/stylesheets")))
			.pipe(browserSync.stream());
	});

	gulp.task("test", function(){
		return gulp.src("./test")
			.pipe(mocha({reporter: "nyan"}));
	});

	gulp.task("default", ["stylesheets", "javascripts"]);
}


function onError(err){
	gutil.log(gutil.colors.red('Error (' + err.plugin + '): ' + err.message));
	this.emit("end");
}