/**js打包
 * 交付*/

var gulp = require('gulp'),

    uglify=require('gulp-uglify'),

    rename = require("gulp-rename");//重命名


function jsDist() {

    gulp.src(['build/js/*.js'])

        .pipe(uglify())

        .pipe(rename({suffix: '.min'}))

        .pipe(gulp.dest('dist/js'));

}

module.exports = jsDist;
