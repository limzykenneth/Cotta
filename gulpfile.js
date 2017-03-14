var gulp = require("gulp");
var minimist = require("minimist");
var argv = minimist(process.argv.slice(2));
var nodemon = require("gulp-nodemon");

if(argv.f){
	require("./frontend/gulpfile.js")(gulp, {
		dir: "./frontend/",
		outDir: "./public/"
	});
}else{
	gulp.task("server", function(){
		nodemon({
			verbose: argv.v || false,
			script: "./bin/www",
			ignore: ["frontend/**/*", "public/**/*"]
		});
	});

	gulp.task("default", function(){
		console.log("another default");
	});
}
