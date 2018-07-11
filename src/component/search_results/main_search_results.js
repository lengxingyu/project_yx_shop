/**
 * Created by ZHUANGYI on 2017/6/26.
 */

var jdSearch_results = {


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


    //收起下拉框
    hidePrompt: function () {

        var allEle = document.getElementById('search_prompt').getElementsByClassName('jd_drop_down');

        for (var i = 0; i < allEle.length; i++) {

            allEle[i].className = 'jd_drop_down';

        }

    },


   //清除show
    hideShow: function (num) {


        //数组1
        var elesOne = ['comprehensive', 'brand', 'filter'];

        //数组2
        var elesTwo = ['volume', 'price'];

        var farEle = document.getElementsByClassName('search_nav_content')[0];

        var thisEle;



        if (num == 1) {     //如果为1 则启用数组1

            thisEle = allEle(elesOne);

        }

        else {    //反之启用数组2

            thisEle = allEle(elesTwo);

        }

        function allEle(className) {

            var ele = [];



            for (var i = 0; i < className.length; i++) {

                ele.push(farEle.getElementsByClassName(className[i])[0]);

            }

            return ele

        }

        for (var i = 0; i < thisEle.length; i++) {

            if (thisEle[i].className.indexOf('show') > -1) {

                thisEle[i].className = thisEle[i].className.replace('show','');

            }

        }

    },


    //筛选模块
    filterBlockEvent: function () {


        //加监听和删除监听
        function sortBlockChoose(num) { //如果mun=1加监听，不等于1解除监听

            var sortBlock = document.getElementsByClassName('sort_block');

            for (var i = 0; i < sortBlock.length; i++) {

                if (num == 1) {

                    document.getElementsByClassName('type')[i].addEventListener('click', addFilterEvent, false);

                }

                else {

                    document.getElementsByClassName('type')[i].removeEventListener('click', addFilterEvent, false);

                }

            }


        }

        function addFilterEvent(e) {


            var evt = e || window.event;

            var thisTargetEle = evt.srcElement || evt.target;

            if (thisTargetEle.className == 'type') { //如果点到的是自己 则class不变

                thisTargetEle.className = 'type';
            }
            else {

                if (thisTargetEle.className.indexOf('selected') > -1) {  //点击本身也会取消

                    thisTargetEle.className = '';
                }
                else {

                    thisTargetEle.className += ' selected';        //也可以点击其他的
                }
            }

        }


        //展开内容
        document.getElementsByClassName('filter')[0].addEventListener('click', function () {


            if (document.getElementById('filter_list').className.indexOf('show') > -1) {


                //jdSearch_results.hideShow(1);

                //点击任意下拉框收回
                jdSearch_results.hidePrompt();

                //收回下拉框
                searchFilter.hide();

                this.className = 'filter';

                sortBlockChoose(0);


            }

            else {


              //jdSearch_results.hideShow(1);

                jdSearch_results.hidePrompt();



                if(this.className.indexOf('show') == -1){


                    this.className += ' show';
                }

                searchFilter.show();

                sortBlockChoose(1);


            }


        });

        //重置
        document.getElementsByClassName('filter_reset')[0].addEventListener('click', filterResetAll, false);


        function filterResetAll() {

            var listBox = document.getElementsByClassName('type');


            for (var i = 0; i < listBox.length; i++) {

                var divEle = listBox[i].getElementsByTagName('div');

                for (var j = 0; j < divEle.length; j++) {

                    divEle[j].className = divEle[j].className.replace('selected', '');

                }

            }

            inputReset();

            //清除input里面的内容

            function inputReset() {

                var inputEle = document.getElementsByTagName('input');


                for (var j = 0; j < inputEle.length; j++) {


                    if (inputEle[j].value) {

                        inputEle[j].value = '';
                    }

                }

            }

        }
    },

    //品牌模块

    brandBlockEvent: function () {

        document.getElementsByClassName('brand_list')[0].addEventListener('click', function (e) {

            var evt = e || window.event;

            var thisTargetEle = evt.srcElement || evt.target;

            if (thisTargetEle.className == 'brand_list') { //如果点到的是自己 则class不变

                thisTargetEle.className = 'brand_list';
            }
            else {

                if (thisTargetEle.className.indexOf('selected') > -1) {  //点击本身也会取消

                    thisTargetEle.className = '';
                }
                else {

                    thisTargetEle.className += ' selected';        //也可以点击其他的
                }
            }

        }, false);

        //下拉框选择
        document.getElementsByClassName('brand')[0].addEventListener('click', function () {


            if (document.getElementById('brand_list').className.indexOf('show') > -1) {


                //jdSearch_results.hideShow(1);

                //页面上只能有一个弹出框
                jdSearch_results.hidePrompt();

                searchBrand.hide();

                this.className = 'brand';

            }

            else {

                //jdSearch_results.hideShow(1);

                jdSearch_results.hidePrompt();

                if(this.className.indexOf('show')== -1){

                    this.className += ' show';
                }



                searchBrand.show();


            }


        }, false);


        //重置

        document.getElementsByClassName('brand_reset')[0].addEventListener('click', resetAll, false);

        function resetAll() {

            var boxEle = document.getElementsByClassName('brand_list')[0];

            var allEle = boxEle.getElementsByTagName('div');

            for (var i = 0; i < allEle.length; i++) { //找到页面上所有的selected 并且删除

                allEle[i].className = allEle[i].className.replace('selected', '')

            }

        }

    },

    //综合模块

    generalBlockEvent: function () {

        var _this=this;

        function addEvent(e) {

            var evt = e || window.event;

            var thisTargetEle = evt.srcElement || evt.target;

            if (document.getElementsByClassName('selected')[0]) {

                document.getElementsByClassName('selected')[0].className = ''

            }

            thisTargetEle.className += ' selected';

            searchGeneral.hide({

                fn: function () {

                    //收回之后删除监听
                    document.getElementsByClassName('general_list')[0].removeEventListener('click', addEvent, false);

                }
            });

            //获取私有值
            document.getElementsByClassName('comprehensive')[0].getElementsByTagName('span')[0].innerHTML = thisTargetEle.getAttribute('data-name');

             //陈羽翔 816 弹出框判断
            _this.zhSelect('general_list','comprehensive');

        }


        document.getElementsByClassName('comprehensive')[0].addEventListener('click', function () {


            if (document.getElementById('general_list').className.indexOf('show') > -1) {


                jdSearch_results.hidePrompt();

                searchGeneral.hide();


            }

            else {


                jdSearch_results.hidePrompt();


                if (this.className.indexOf('show') == -1) {


                    this.className += ' show';

                }



                searchGeneral.show({

                    fn: function () {

                        document.getElementsByClassName('general_list')[0].addEventListener('click', addEvent, false);


                    }
                })


            }


        }, false);
    },


    //搜索模块


    searchRecommend: function (details) {

        var _this=this;

        var keyFn=0;

        var categoryFn=0;

        if(details.keyFn){//判断有没有值

            keyFn=details.keyFn;
        }
        if(details.categoryFn){//判断有没有值

            categoryFn=details.categoryFn;
        }

        var thisEle = document.getElementsByClassName('search_results_recommend')[0];

        thisEle.addEventListener('click', function (e) {

            var evt = e || window.event;//兼容性

            var thisTargetEle = evt.srcElement || evt.target;



            if (thisTargetEle != thisEle) {

                var targetEle;



                if (thisTargetEle.className.indexOf('product') > -1) { //如果点击是他本身

                    targetEle = thisTargetEle;

                }



                else {  //如果不是的话

                    targetEle = thisTargetEle.parentNode   //等于他的父元素
                }


                var fatherEle = document.getElementsByClassName('search_tab')[0];

                var productEle = fatherEle.getElementsByClassName('product_choose');


                //删除框
                if (productEle.length > 1) { //如有页面有个元素的话 执行

                    for (var i = 0; i < 2; i++) {

                        productEle[0].parentNode.removeChild(productEle[0]);//删除自己

                    }

                }

                //搜索的关键词
                _this.keyName=document.getElementsByClassName('search_tab')[0].getElementsByTagName('span')[0].innerHTML;

                //分类的关键词
                _this.categoryName=targetEle.getElementsByTagName('span')[0].innerHTML;


                //获取需要插入的元素
                _this.caseBox(_this.keyName,keyFn);

                _this.caseBox(_this.categoryName,categoryFn);

                //清除两个小框
                document.getElementsByClassName('search_recommend_content')[0].innerHTML = ''

                //出现框子

            }


        }, false)

    },


    //小框模板
    caseBox:function (caseName,fn) {

        var addEle = document.createElement('div');  //添加一个元素的tag

        var boxEle = document.getElementsByClassName('product_choose');

        addEle.className = 'product_choose';   //添加元素的classname

        addEle.innerHTML = caseName;  //添加元素的innerHtml

        //添加框之前先删除原有的
        if (boxEle.length > 1) { //如有页面有个元素的话 执行

            for (var i = 0; i < 2; i++) {

                boxEle[0].parentNode.removeChild(boxEle[0]);//删除自己

            }

        }


        if(fn){

            addEle.addEventListener('click',fn,false);

        }

        //点击之后内容代入至搜索框
        addEle.addEventListener('click', function (event) {

            var eleBlock = document.getElementsByClassName('product_choose');

            for (var j = 0; j < eleBlock.length; j++) { //遍历一遍需要的元素

                if (eleBlock[j].innerHTML != this.innerHTML) {  //如果他点击的元素不是他本身 break

                    break
                }
            }
            document.getElementsByClassName('search_tab')[0].getElementsByTagName('span')[0].innerHTML = eleBlock[j].innerHTML; //赋值

            for (var a = 0; a < 2; a++) {   //删除本身

                eleBlock[0].parentNode.removeChild(eleBlock[0]);
            }

            //阻止事件冒泡&默认事件

            event.preventDefault();

            event.stopPropagation();


        }, false);

        var tagEle = document.getElementsByClassName('search_tab')[0].getElementsByTagName('span')[0];

        document.getElementsByClassName('search_tab')[0].insertBefore(addEle, tagEle);  //在span前插入内容
    },


    //价格选择
    priceChoose: function () {

        var _this = this;

        var allEle = document.getElementsByClassName('search_results_tab');

        for (var i = 0; i < allEle.length; i++) {

            allEle[i].addEventListener('click', function () {


                remove();//先清空

                this.className += ' show';

                //_this.hidePrompt();

                searchGeneral.hide();

                //陈羽翔 816 弹出框判断
                _this.zhSelect('general_list','comprehensive');



            }, false);


            function remove() {

                for (var j = 0; j < allEle.length; j++) {

                    if (allEle[j].className.indexOf('show') > -1) {

                        allEle[j].className = allEle[j].className.replace('show', '')

                    }
                }

            }
        }
    },


   // _this.zhSelect('general_list','comprehensive');

    //陈羽翔 816
    zhSelect:function (id,className) {

        var dis=document.getElementById(id);

        var ele=document.getElementsByClassName('search_results_nav')[0].getElementsByClassName(className)[0];

        var row=ele.getElementsByClassName('arrow')[0];

        setTimeout(function () {

            if(dis.className.indexOf('show')<0&&ele.className.indexOf('show')>-1&&row.className.indexOf('another')<0){  //当弹框收起、综合点亮、箭头无变化时

                row.className+=' another'

            }

            else{

                row.className=row.className.replace(' another','')

            }

        },100)

    },


    //光标

    inputCursor:function () {

    var thisId = document.getElementById('filter_list')

    var inputEle = thisId.getElementsByClassName('filter_input')

    for (var i=0;i<inputEle.length;i++){


        inputEle[i].addEventListener('focus',function () {

            thisId.getElementsByClassName('jd_drop_down_content')[0].style.position = 'absolute'

        },false)



        inputEle[i].addEventListener('blur',function () {

            thisId.getElementsByClassName('jd_drop_down_content')[0].style.position = 'fixed'

        },false)
    }


}

};






