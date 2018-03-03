const gulp = require("gulp");
const rename = require("gulp-rename");
const nodemon = require("gulp-nodemon"),
	  browserSync = require("browser-sync");
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

const handlebars = require("gulp-handlebars"),
	  defineModule = require("gulp-define-module");

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
	gulp.task("nodemon", ["default"], function(cb){
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

	gulp.task("server", ["nodemon"]);

	// Tests
	gulp.task("test", function(){
		return gulp.src("./test")
			.pipe(mocha({reporter: "nyan"}));
	});

	gulp.task("default", function(){

	});
}


function onError(err){
	gutil.log(gutil.colors.red("Error (" + err.plugin + "): " + err.message));
	this.emit("end");
}