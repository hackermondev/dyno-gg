const gulp = require('gulp');
const ts = require('gulp-typescript');
const pegjs = require('gulp-pegjs');
const sourcemaps = require('gulp-sourcemaps');
const tsProject = ts.createProject('./tsconfig.json');

gulp.task('ts', function () {
	return tsProject.src()
		.pipe(sourcemaps.init())
        .pipe(tsProject())
		.js
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('build'));
});

gulp.task('peg', function() {
    return gulp.src('src/Parser.pegjs')
        .pipe(pegjs({ format: 'commonjs' }))
        .pipe(gulp.dest('build'));
});

gulp.task('build', ['ts', 'peg']);