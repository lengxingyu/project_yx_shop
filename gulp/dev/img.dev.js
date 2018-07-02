/**
 * Created by Qiaodan on 2017/6/20.
 */

var gulp = require('gulp'),

    imagemin = require('gulp-imagemin'),//图片压缩

    pngquant = require('imagemin-pngquant'),//png压缩

    cache = require('gulp-cache'),//缓存

    connect = require('gulp-connect')//服务器

function devImg(){
    gulp.src('src/images/**/*.*')
        .pipe(cache(imagemin({
            progressive: true,

            svgoPlugins: [{removeViewBox: false}],

            use: [pngquant()]
        })))
        .pipe(gulp.dest('build/images'))

        .pipe(connect.reload())
}

module.exports=devImg;
