/**
 * Created by Qiaodan on 2017/5/25.
 */


//懒加载以及异步加载
var jfLazyLoading = {

    //图片懒加载
    lazyLoadInit: function (details) {

        var _this = this;

        if (!details) {//如果details未输入，则防止报错
            details = {};
        }

        _this.thisImgEle = details.thisImgEle || 'loading_img';//显示的图片,class选择器

        _this.bottomDistance = details.bottomDistance || '50';//图片未显示时距离底部的距离。触发加载的距离


        _this.getLazyDistance(); //页面初始化先执行一次；


        //鼠标滚动事件，触发事件
        addEventListener("scroll", function () {

            _this.getLazyDistance()

        }, false)

    },

    //获取图片距离底部的距离
    getLazyDistance: function () {

        var _this = this;

        var thisScrollTop = document.body.scrollTop;//获取滚动条的距离

        var thisWindowHeight = window.innerHeight;//屏幕可视窗口高度

        var thisMaxHeight = parseFloat(thisScrollTop) + parseFloat(thisWindowHeight);//变化的距离(窗口高度+滚动条距离)

        var allLazyEle = document.getElementsByClassName(_this.thisImgEle);

        for (var i = 0; i < allLazyEle.length; i++) {

            var thisTopDistance = allLazyEle[i].offsetTop;//元素距离文档顶部的距离

            var thisImgSrc = allLazyEle[i].getAttribute('data-src');//获取当前元素的地址

            if (parseFloat(thisTopDistance) - thisMaxHeight <= _this.bottomDistance) {

                allLazyEle[i].setAttribute('src', thisImgSrc)//替换图片地址

            }

        }

    },


    /*异步加载*/
    ajaxLoadInit: function (details) {

        var _this = this;

        if (!details) {//如果details未输入，则防止报错
            details = {};
        }
        _this.ajaxLoadDistance = details.ajaxLoadDistance || '50';//元素未显示时距离底部的距离。触发加载的距离

        _this.fn = details.fn || 0;//默认执行的脚本

        //鼠标滚动事件
        addEventListener("scroll", function () {

            _this.getAjaxLoadDistance();

        }, false)

    },

    //获取异步加载的触发距离
    getAjaxLoadDistance: function () {
        var _this = this;

        var thisScrollTop = document.body.scrollTop;//获取滚动条的距离

        var thisDocumentHeight = document.body.scrollHeight;//获取当前文档的高度

        var thisWindowHeight = window.innerHeight;//屏幕可视窗口高度

        if (parseFloat(thisDocumentHeight) - parseFloat(thisScrollTop + thisWindowHeight) <= _this.ajaxLoadDistance) {//如果当前文档底部距离窗口底部的距离小于50，执行相应的脚本

            if (_this.fn) {

                _this.fn();
            }

        }

    },

    //异步加载的内容
    ajaxContentInit: function (details) {

        var _this = this;

        if (!details) {//如果details未输入，则防止报错
            details = {};
        }


        _this.productdata = details.productdata || [


            {
                "data_href": "javascript:",
                "loading_src": "../../images/img_loading.gif",
                "data_src": "../../images/img_loading.gif",
                "acc_text": false,
                "gift_text": false,
                "product": "***",
                "price_text": "0.00",
                "praise": "100%",

            }
        ];

        var thisInner = '';

        for (var i = 0; i < _this.productdata.length; i++) {


            thisInner =
                '<div class="product_main_img"><img class="loading_img" data-src='
                + _this.productdata[i].data_src +
                ' src='
                + _this.productdata[i].loading_src +
                '></div><div class="product_main_title">';

            if (_this.productdata[i].acc_text) {

                thisInner +=
                    '<span class="acc">'
                    + '附' +
                    '</span>'
            }

            if (_this.productdata[i].gift_text) {
                thisInner +=
                    '<span class="gift">'
                    + '赠' +
                    '</span>'

            }

            /*+'<span class="acc">'
             + _this.productdata[i].acc_text+
             '</span>'

             +'<span class="gift">'
             + _this.productdata[i].gift_text+
             '</span>'*/

            thisInner += _this.productdata[i].product +

                '</div><div class="product_main_price"><span class="price">￥'

                + _this.productdata[i].price_text +

                '</span><span class="praise"><span>'

                + _this.productdata[i].praise +

                '</span>好评</span></div>';

            var thisAddEle = _this.ajaxAddnode('a', thisInner, 'product');//增加a标签

            thisAddEle.setAttribute('href', _this.productdata[i].data_href)

        }

        var allAccEle = document.getElementsByClassName('hot_goods_list')[0].getElementsByClassName('acc');//所有‘附’字的span元素；

        var allGiftEle = document.getElementsByClassName('hot_goods_list')[0].getElementsByClassName('gift');//所有‘赠’字的span元素


        //判断当前有没有‘附’字
        /*for(var i=0;i<allAccEle.length;i++){

         if(allAccEle[i].innerHTML==""){

         allAccEle[i].style.display="none"
         }

         }
         //判断当前有没有‘赠’字
         for(var i=0;i<allGiftEle.length;i++){

         if(allGiftEle[i].innerHTML==""){
         allGiftEle[i].style.display="none"
         }

         }*/


    },

    //添加元素
    ajaxAddnode: function (tag, innerHtml, className) {

        var _this = this;

        var obj = document.createElement(tag);

        if (className) {

            obj.className = className
        }

        obj.innerHTML = innerHtml;

        //obj.setAttribute('href',_this.productdata[i].data_href);

        document.getElementsByClassName('hot_goods_list')[0].appendChild(obj);

        return obj
    }
}

//懒加载以及异步加载结束


