'use strict';

const gulp = require('gulp');
const eslint = require('gulp-eslint');
const sass = require('gulp-sass');
const sourcemaps = require('gulp-sourcemaps');
const wait = require('gulp-wait');

const paths = ['src/**/*.js'];
const cssPaths = {
	src: './sass/**/*.scss',
	dest: './public/css',
};

gulp.task('sass', () => {
  return gulp.src(cssPaths.src)
    .pipe(wait(100))
    .pipe(sourcemaps.init())
    .pipe(sass({
      includePaths: './node_modules',
      outputStyle: 'compressed',
    }).on('error', sass.logError))
    .pipe(sourcemaps.write('./maps'))
    .pipe(gulp.dest(cssPaths.dest));
});

gulp.task('default', gulp.series('sass'));

gulp.task('watch', gulp.series('sass', () => {
  gulp.watch(['./sass/**/*.scss', './sass/**/*.sass'], gulp.series('sass'));
}));

gulp.task('lint', () => {
  gulp.src(paths)
  .pipe(eslint())
  .pipe(eslint.format())
  .pipe(eslint.failAfterError());
});



gulp.task('sass:watch', gulp.series('sass', () => {
  gulp.watch(['./sass/**/*.scss', './sass/**/*.sass'], gulp.series('sass'));
}));

gulp.task('sass:prod', () => {
  return gulp.src(cssPaths.src)
    .pipe(sass({
      includePaths: './node_modules',
      outputStyle: 'compressed',
    }).on('error', sass.logError))
    .pipe(gulp.dest(cssPaths.dest));
});
