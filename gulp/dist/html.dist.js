/**
 * Created by Qiaodan on 2017/6/20.
 */


var gulp = require('gulp'),

    htmlmin = require('gulp-htmlmin'),

    cheerio = require('gulp-cheerio');




function htmlDist() {

    var options = {

        removeComments: false,//清除HTML注释

        collapseWhitespace: false,//压缩HTML

        collapseBooleanAttributes: true,//省略布尔属性的值 <input checked="true"/> ==> <input />

        removeEmptyAttributes: true,//删除所有空格作属性值 <input id="" /> ==> <input />

        removeScriptTypeAttributes: true,//删除<script>的type="text/javascript"

        removeStyleLinkTypeAttributes: true,//删除<style>和<link>的type="text/css"

        minifyJS: false,//压缩页面JS

        minifyCSS: false//压缩页面CSS

    };


    gulp.src(['build/html/**/*'])

        .pipe(cheerio(
            {
                run:function ($) {

                    $('script').each(function (index, ele) {

                        if ($(this).attr('src')) {

                            if ($(this).attr('src').indexOf('.min.js') <= -1) {

                                var htmlSrc = $(this).attr('src');

                                htmlSrc = htmlSrc.replace('.js', '.min.js');

                                $(this).attr('src', htmlSrc);

                            }

                        }

                    });

                    $('link').each(function (index, ele) {

                        if ($(this).attr('rel')) {

                            if ($(this).attr('href').indexOf('.min.css') <= -1) {

                                var htmlSrc = $(this).attr('href');

                                htmlSrc = htmlSrc.replace('.css', '.min.css');

                                $(this).attr('href', htmlSrc);

                            }

                            if ($(this).attr('href').indexOf('newcomponent') > -1) {


                                $(this).remove()

                            }
                        }

                    })

                },

                parserOptions: {
                    // Options here
                    decodeEntities: false
                }
            }
        ))

        //.pipe(htmlmin(options))

        .pipe(gulp.dest('dist/html'));

    gulp.src("build/*.html")

        .pipe(gulp.dest('dist'));

}

module.exports = htmlDist;