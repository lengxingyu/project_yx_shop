/**
 * Created by Qiaodan on 2017/6/20.
 */


/**服务器设置
 * 开发*/

var gulp = require('gulp'),

    connect = require('gulp-connect'),

    option = require('../config.js').serverDev;//服务器



function devServer() {
    //
    connect.server(option);

}

module.exports = devServer;