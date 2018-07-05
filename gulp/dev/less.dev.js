/**
 * Created by Qiaodan on 2017/6/20.
 */

var gulp = require('gulp'),

    less = require('gulp-less'),//less解码

    autoprefixer = require('gulp-autoprefixer'),//css兼容性

    concatDir = require('gulp-concat-dir'),//按文件夹合并

    concat = require("gulp-concat"),//文件合并

    connect = require('gulp-connect'),//服务器

    rename = require("gulp-rename");//重命名

function lessDev(){


    gulp.src('src/**/*.less')

        .pipe(less())
        .pipe(autoprefixer({

            browsers: ['Android >= 4.0', 'IOS >=7', 'Firefox >= 20', 'ie >= 8'],//兼容设备

            cascade: true, //是否美化属性值 默认：true 像这样：
            //-webkit-transform: rotate(45deg);
            //        transform: rotate(45deg);
            remove: true //是否去掉不必要的前缀 默认：true

        }))
        .pipe(concat('jdShopMain.css'))

        .pipe(gulp.dest('build/css'))
        .pipe(connect.reload())
}

module.exports=lessDev;