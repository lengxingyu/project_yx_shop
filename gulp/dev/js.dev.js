/**
 * Created by Qiaodan on 2017/6/20.
 */


var gulp = require('gulp'),

    concatDir = require('gulp-concat-dir'),//按文件夹合并

    connect = require('gulp-connect'),//服务器

    concat = require("gulp-concat"),//文件合并

    rename = require("gulp-rename");//重命名

function devJs(){
    gulp.src(['src/js/*.js'])

        .pipe(gulp.dest('build/js'))

        .pipe(connect.reload())
}

module.exports=devJs;