/**
 * Created by Qiaodan on 2017/6/20.
 */
var gulp = require('gulp'),

    clean=require('gulp-clean-css'),

    concat = require("gulp-concat"),//文件合并

    rename = require("gulp-rename");//重命名

function cssDist(){
    gulp.src('bulid/css/*.css')

        .pipe(clean())

        .pipe(rename({suffix:'.min'}))

        .pipe(gulp.dest('dist/css'))

}

module.exports=cssDist;