/**
 * Created by Qiaodan on 2017/6/20.
 */

var gulp = require('gulp'),

    ejs = require('gulp-ejs'),//ejs模板

    cheerio = require('gulp-cheerio'),//批量更换html中的引用

    connect = require('gulp-connect'),//服务器

    rename = require("gulp-rename");//重命名

     bom=require("gulp-bom")

function devEjs(){

    gulp.src('src/view/**/*.{ejs,html}')

        .pipe(ejs())

        //增加媒体查询，通用样式文件
        .pipe(cheerio({

            run:function ($) {

                var addHtml = "";

                addHtml += "<link rel='stylesheet'  href='../../css/bootstrap.min.css'/>\n";//第二版开发样式

                addHtml += "<meta name='viewport' content='width=device-width,initial-scale=1,user-scalable=0,minimum-scale=1, maximum-scale=1'>\n";

                addHtml += "<meta name='apple-mobile-web-app-capable' content='yes' />\n";

                addHtml += "<meta name='apple-mobile-web-app-status-bar-style' content='black' />\n";

                addHtml += "<meta name='format-detection' content='telephone=no, email=no' />\n";

                addHtml += "<link rel='stylesheet'  href='../../css/demo.css'/>\n";

                $('head').prepend(addHtml);


            },
            parserOptions: {
                // Options here
                decodeEntities: false
            }

        }



))

        .pipe(cheerio(function($){

            var addJsMain = '\n<script src="../js/jquery-3.0.0.min.js"></script>\n<script src="../js/demo.js"></script>\n';//主要的脚本文件
            var addJsHtml="";

            var addJsRun="<script>\n";

            var addJsHtmlHead="<script src='";

            var addJsHtmlBottom="'></script>\n";

            $('script').each(function(index,ele){

                if($(this).attr('src')){

                    addJsHtml+=addJsHtmlHead+$(this).attr('src')+addJsHtmlBottom
                }else {
                    addJsRun += $(this).html() + '\n';
                }

            });

            addJsRun += "\n</script>\n";

            $('script').remove();

            $('body').append(addJsMain);

            $('body').append(addJsHtml);

            $('body').append(addJsRun);

        }))
        .pipe(rename({
            extname:".html"
        }))
        .pipe(gulp.dest('build/html'))

        .pipe(bom())

        .pipe(connect.reload())


}
module.exports=devEjs;
