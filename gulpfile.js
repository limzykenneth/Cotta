const gulp = require("gulp");
const nodemon = require("gulp-nodemon");
const mocha = require("gulp-mocha");
const gutil = require("gulp-util");


gulp.task("default", function(done){
	done();
});

// Run server
gulp.task("nodemon", gulp.series("default", function(cb){
	var started = false;

	return nodemon({
		script: "./bin/www",
		ignore: ["public/**/*"]
	}).on("start", function(){
		if(!started){
			cb();
			started = true;
		}
	});
}));

gulp.task("server", gulp.series("nodemon"));

// Tests
gulp.task("test", function(){
	return gulp.src("./test")
		.pipe(mocha({reporter: "nyan"}));
});


function onError(err){
	gutil.log(gutil.colors.red("Error (" + err.plugin + "): " + err.message));
	this.emit("end");
}