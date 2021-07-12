'use strict';

const gulp = require('gulp');
const babel  = require('gulp-babel');
const eslint = require('gulp-eslint');
const sass = require('gulp-sass');
const sourcemaps = require('gulp-sourcemaps');

const paths = ['src/**/*.js'];
const cssPaths = {
	src: './sass/**/*.scss',
	dest: './public/css',
};

gulp.task('default', ['build']);

gulp.task('watch', ['build'], () => {
  gulp.watch(paths, ['build']);
});

gulp.task('build', ['sass', 'babel']);

gulp.task('lint', () => {
  gulp.src(paths)
  .pipe(eslint())
  .pipe(eslint.format())
  .pipe(eslint.failAfterError());
});

gulp.task('sass', () =>
  gulp.src(cssPaths.src)
    .pipe(sourcemaps.init())
    .pipe(sass({
      includePaths: './node_modules',
      outputStyle: 'compressed',
    }).on('error', sass.logError))
    .pipe(sourcemaps.write('./maps'))
    .pipe(gulp.dest(cssPaths.dest)));

gulp.task('sass:watch', () => {
  gulp.watch(['./sass/**/*.scss', './sass/**/*.sass'], ['sass']);
});

gulp.task('babel', () => {
  gulp.src(paths)
  .pipe(babel())
  .pipe(gulp.dest('build'));
});
