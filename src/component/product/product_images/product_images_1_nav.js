/**
 * Created by ZHUANGYI on 2017/6/5.
 */


var
    jfProductDetails = {


    //------ 安卓系统滑动到一定位置固定tab

    slidePositionTab: function () {


        if (!browser.os.iOS) {  //判断机型

            var thisNavTab = document.getElementById('NavTab');

            var thisNavTabEmpty = document.getElementById('NavTabEmpty');


            function scrcoll() {

                if (thisNavTabEmpty.getBoundingClientRect().top <= 0) { //元素到页面顶端的位置

                    thisNavTab.style.position = 'fixed';

                    thisNavTab.style.top = '45px';

                    thisNavTab.style.zIndex = '100'

                }

                else {

                    thisNavTab.style.cssText = "";

                }
            }

            scrcoll();
        }

    },

    //------点击切换class

    clickTabChange: function (fatherEle, changeClass, className) {


        var allEle = fatherEle.getElementsByClassName(className);


        for (var i = 0; i < allEle.length; i++) {

            allEle[i].addEventListener('click', function () {

                fatherEle.getElementsByClassName(changeClass)[0].className = fatherEle.getElementsByClassName(changeClass)[0].className.replace(changeClass, '');

                this.className += ' ' + changeClass;

            }, false);

        }


    },


    //------ 多个sku点击
    skuBoxChange: function () {

        var skuBox = document.getElementById('main_sku').getElementsByClassName('sku_contain');

        for (var i = 0; i < skuBox.length; i++) {

            jfProductDetails.clickTabChange(skuBox[i], 'choose_tab', 'sku_box');
        }

    },


    //------tab点击切换页面

    tabScrollChange: function () {

        window.addEventListener('scroll', function () {


            var thisNavTab = document.getElementById('NavTab');

            var topTabHeigt = document.getElementsByClassName('product_nav_contain')[0];

            var a = thisNavTab.offsetHeight + topTabHeigt.offsetHeight;

            var parameterBlockDis = document.getElementsByClassName('product_images_parameter')[0];                         //参数规格到页面顶部的距离

            var serviceBlockDis = document.getElementsByClassName('product_images_service')[0];                             //售后到页面顶部的距离


            var imgBlockDis = document.getElementsByClassName('product_images')[0];


            if (imgBlockDis.getBoundingClientRect().top > thisNavTab.offsetHeight) {                                       //超出部分大于45 = 商品


                slideTabChoose(document.getElementsByClassName('content')[0], 'nav_tab', 0);

            }

            else if (imgBlockDis.getBoundingClientRect().top <= thisNavTab.offsetHeight) {                                //img模块小于等于45 = 图文


                slideTabChoose(document.getElementsByClassName('content')[0], 'nav_tab', 1);


                function titleTabChange() {                                                                                //图文&参数&售后切换


                    if (serviceBlockDis.getBoundingClientRect().top - a <= 0) {                                             //参数模块到页面顶部的距离 a为两个导航的和


                        slideTabChoose(document.getElementById('NavTab'), 'tab', 2);

                    }
                    else if (parameterBlockDis.getBoundingClientRect().top - a <= 0) {


                        slideTabChoose(document.getElementById('NavTab'), 'tab', 1);

                    }
                    else {

                        slideTabChoose(document.getElementById('NavTab'), 'tab', 0);
                    }
                }

                titleTabChange();

            }
            function slideTabChoose(element, childClassName, num) {                                                    //选择切换tab

                if (element.getElementsByClassName('choose_tab')[0]) {


                    element.getElementsByClassName('choose_tab')[0].className = element.getElementsByClassName('choose_tab')[0].className.replace('choose_tab', '');

                }

                element.getElementsByClassName(childClassName)[num].className += ' choose_tab';

            }


        });


    },

    //------点击滚动条到固定位置

    scrollEle: function (ele, distance) {


        var eleScrollTop = ele.getBoundingClientRect().top + getScrollTop() - distance;

        var scrollTopMove = setInterval(interValScroll, 5);                                                             //循环

        var iChage = 0;                                                                                                 //循环计数

        var elasticity = 1;                                                                                             //变化的计量

        var thisScrollTop;

        var changeDistanceScrollTop = eleScrollTop - getScrollTop();                                           //真实的相差距离

        function interValScroll() {

            elasticity = (25 - iChage) / 25 * .9 + 1;                                                                   //变化的计量=(25-此时的计数)/25*.9+1; 用于乘法的计量，大概变化过程：1.5 -> 1 -> 0.5 ，模拟平滑过渡

            thisScrollTop = getScrollTop() + changeDistanceScrollTop / 50 * elasticity;                        //计算此时的距离

            //console.log('页面滚动距离'+getScrollTop());

            window.scrollTo(0, thisScrollTop);

            iChage++;                                                                                                   //计数

            if (iChage == 50) {

                window.scrollTo(0, eleScrollTop);


                clearInterval(scrollTopMove);                                                                           //如果到50，则结束循环

                //console.log('最后滚动为止：'+eleScrollTop)


            }




        }

        //兼容性修正
        function getScrollTop(){

            var scrollTop=0;

            if(document.documentElement&&document.documentElement.scrollTop){

                scrollTop=document.documentElement.scrollTop;

            }else if(document.body){

                scrollTop=document.body.scrollTop;
            }
            return scrollTop;
        }

    },

    //------切换立即购买&加入购物车

    changeHideBtn: function (classBtn) {

        var FatherBtn = document.getElementsByClassName('prompt_btn')[0];

        FatherBtn.getElementsByClassName('hidebtn')[0].className = FatherBtn.getElementsByClassName('hidebtn')[0].className.replace('hidebtn', '');

        FatherBtn.getElementsByClassName(classBtn)[0].className += ' hidebtn';

    },

    //------购物车加减按钮

    volumeChange: function (isProduct) {  //如果是详情页的话为true，不是的话为false

        var volumeBox = document.getElementsByClassName('volume_btn');

        var lastScrollTop;

        for (var i = 0; i < volumeBox.length; i++) {   //找到当前的父元素

            volumeBox[i].getElementsByClassName('reduce')[0].addEventListener('touchstart', reduceEle, false);          //对 加&减

            volumeBox[i].getElementsByClassName('add')[0].addEventListener('touchstart', reduceEle, false);

            volumeBox[i].getElementsByClassName('volume_input')[0].addEventListener('blur', valueOne, false);          //对 加&减

            if (browser.os.iOS && isProduct) {

                var inputEle = volumeBox[i].getElementsByClassName('volume_input')[0];

                inputEle.addEventListener('focus', focusScrollPosition, false);

                inputEle.addEventListener('blur', blurScrollPosition, false);
            }
/*            else {

                var inputEle = volumeBox[i].getElementsByClassName('volume_input')[0];

                inputEle.addEventListener('focus', focusAndroidTab, false);

                inputEle.addEventListener('blur', blurAndroidTab, false);
                
                

            }*/

        }

        function focusAndroidTab() {

            document.getElementById('settlementTab').style.display = 'none';

            document.getElementById('deleteTab').style.display = 'none';

            document.getElementsByClassName('bottom_tabbar')[0].style.display = 'none'



        }

        function blurAndroidTab() {

            document.getElementById('settlementTab').style.display = '';

            document.getElementById('deleteTab').style.display = '';

            document.getElementsByClassName('bottom_tabbar')[0].style.display = ''

        }

        function reduceEle() {


            var eleInput = this.parentNode.getElementsByClassName('volume_input')[0];

            var thisValue = parseInt(eleInput.value);

            if (this.className.indexOf('reduce') > -1) {


                eleInput.value = changeValue(thisValue - 1);


            }
            else {

                eleInput.value = changeValue(thisValue + 1);

            }


        }

        function changeValue(num) { //循环 小于等于1的时候永远为1，反之为他本身的值


            if (num <= 1 || !num) {

                return 1;
            }
            else {

                return num;
            }

        }

        function blurScrollPosition() {

            window.scrollTo(0, lastScrollTop);

            valueOne();


        }

        function valueOne() {

            this.value = changeValue(this.value); //如果输入的内容为0或者空时,value为1

        }

        function focusScrollPosition() {

            lastScrollTop = document.body.scrollTop;

            setTimeout(function () {

                window.scrollTo(0, document.body.scrollHeight);

            }, 300)

        }


    },


    //------弹出框点穿问题 0904更新
    clickThrough:function (fatherEle,hasScrollEle) {

    var thisScrollEle = document.getElementById(fatherEle).getElementsByClassName(hasScrollEle);

    //var thisVolum = document.getElementById('product_prompt_buy').getElementsByClassName('sku_volume_purchased')[0];

    var popTop = document.getElementsByClassName('pop_top')[0];

    var thisAddress = document.getElementById('jd_address_select').getElementsByClassName('top_address')[0];

    var startY, endY, distance;//开始距离、移动距离

/*        for (var i=0;i<thisScrollEle.length;i++){

            if(thisScrollEle[i].clientHeight < thisScrollEle[i].offsetHeight-4){

                thisScrollEle[i].addEventListener('touchstart', touchStartEle, false);

                thisScrollEle[i].addEventListener('touchmove', reachEdge, false);

            }

            else {

                thisScrollEle[i].addEventListener('touchmove,touchstart',windowBanEvent.Canceling,false);
            }

        }*/
        for(var i=0;i<thisScrollEle.length;i++){



            thisScrollEle[i].addEventListener('touchstart', touchStartEle, false);

            thisScrollEle[i].addEventListener('touchmove', reachEdge, false);

        }




    if(thisAddress){

        thisAddress.addEventListener('touchmove,touchstart',windowBanEvent.Canceling,false);

    }

    popTop.addEventListener('touchmove',windowBanEvent.Canceling,false);

    //thisScrollEle.addEventListener('touchmove', reachEdge, false);


    function touchStartEle(e) {

        //touchstart 获取位置startY

        startY = e.touches[0].pageY;

    }


    function reachEdge(event) {

        var _this = this;

        var eleScrollHeight = _this.scrollTop;//获取滚动条的位置 206

        var eleHeight = _this.scrollHeight;//元素实际高度 506

        var containerHeight = _this.offsetHeight;//容器高度 300


        //touchmove 获取位置 endY

        endY = event.touches[0].pageY;

        //两者之减的距离用来判断是向上活动还是向下滑动
        distance = startY - endY;

        //此时touchmove的值等于touchstart的值 循环
        endY = startY;


        //滚动条到达底部

        if (Math.abs(parseFloat(eleHeight) - parseFloat(eleScrollHeight + containerHeight)) <= 2) {


            //如果距离为正数 则向上滑动是 禁止浏览器事件

            if (distance > 0) {

                event.preventDefault();


            }


        }

        else if (Math.abs(parseFloat(eleScrollHeight)) == 0) {

            //如果距离为负数 则向下滑动

            if (distance < 0) {

                event.preventDefault();

            }


        }

    }


},


    //------弹出框滚动条 0125更新
    accSrcollToTop:function () {

        document.getElementById('product_prompt_acc').getElementsByClassName('pop_cancel')[0].addEventListener('click',toTop,false);

        document.getElementById('product_prompt_acc').getElementsByClassName('jf_pop_up_bg')[0].addEventListener('click',toTop,false);

        function toTop() {

            document.getElementById('product_prompt_acc').getElementsByClassName('pop_content')[0].scrollTop = 0
            
        }
    },


    //------关注

    likeGoods:function(ele) {

    var thisEle = ele;

    if(thisEle.className.indexOf('like_red') > -1){

        thisEle.className = 'btn';

        thisEle.getElementsByTagName('p')[0].innerHTML = '关注'

    }
    else {

        thisEle.className = 'btn like_red';

        thisEle.getElementsByTagName('p')[0].innerHTML = '已关注'
    }

},


    //------关注
    slidePositionSimilarTab: function () {


        if (!browser.os.iOS) {  //判断机型

            var thisNavTab = document.getElementsByClassName('similar_details_nav')[0];

            var thisNavTabEmpty = document.getElementsByClassName('similar_tab_box')[0];


            function scrcoll() {

                if (thisNavTabEmpty.getBoundingClientRect().top <= 0) { //元素到页面顶端的位置

                    thisNavTab.style.position = 'fixed';

                    thisNavTab.style.top = '45px';

                    thisNavTab.style.zIndex = '100'

                }

                else {

                    thisNavTab.style.cssText = "";

                }
            }

            scrcoll();
        }

    },


};

















