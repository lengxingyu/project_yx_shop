

/*图片缩放*/
function initBannerTouch(details) {


    var leftFn=details.leftFn;

    var rightFn=details.rightFn;


    //需要加监听的元素
    var moveEle = document.getElementsByClassName("jd_banner_touch");

    for(var i=0;i<moveEle.length;i++){

        moveEle[i].addEventListener('touchstart', imgTouchStart, false);

        moveEle[i].addEventListener('touchmove', imgTouchMove,false);

        moveEle[i].addEventListener('touchend', imgTouchEnd, false);


    }


    /*储存是否需要更新第一次的位置*/
    var isSaveDistance = true;

    //存储上一次距离
    var firstDistance = 0;

    /*缓存最新的距离*/
    var lastDistance = 0;

    /*上一次的放大缩小比例*/
    var pastProportion = 1;

    /*保存最新的移动参考位置*/
    var lastPalace = [0, 0];

    /*缓存第一次移动参考位置*/
    var firstPalace = [0, 0];

    /*保存每次元素真正偏移位置*/
    var lastPositionTransform = [0, 0];

    /*上一次的偏移位置*/
    var pastPositionTransform = [0, 0];

    /*保存移动方式*/
    var howMove = 0;


    /*缓存本次比例*/
    var proportion = 1;


    function imgTouchStart(evt) {

        /*删除所有变换*/
        while (this.className.indexOf('move') != -1) {

            this.className = this.className.replace('move', '')

        }

        /*去除ios抖动*/
        /* if(browser.os.iOS && this.className.indexOf('ios')==-1){

         this.className+=' ios'

         }*/

        /*初始化放大缩小倍数
         * */
        pastProportion = 1;

        proportion = 1;

        /*自锁打开*/
        isSaveDistance = true;

        /*初始化移动方式*/
        howMove = 0;

        pastPositionTransform = [0, 0];

    }


    //放大缩小事件
    function imgTouchMove(evt) {

        if (evt.touches.length == 1 && (howMove == 1 || howMove == 0) && this.getAttribute('data-proportio') && this.getAttribute('data-proportio') != 1) {

            howMove = 1;
            /*单个就保存一个的位置*/
            lastPalace = [evt.touches[0].pageX, evt.touches[0].pageY];

            /*判断是否是第一次一个手指，是的话就缓存该位置*/
            if (isSaveDistance) {

                /*自锁*/
                isSaveDistance = false;

                /*保存第一次居中位置*/
                firstPalace = lastPalace;

                /*如果有上次改变值，则作为乘积，缓存*/
                if (this.getAttribute('data-proportio')) {

                    proportion=pastProportion = this.getAttribute('data-proportio');

                    /*上一次x轴偏移*/
                    pastPositionTransform[0] = parseInt(this.getAttribute('data-left'));

                    /*上一次y轴偏移*/
                    pastPositionTransform[1] = parseInt(this.getAttribute('data-top'))

                }

            }

            lastPositionTransform = [

                (lastPalace[0] - firstPalace[0]) / proportion + pastPositionTransform[0],

                (lastPalace[1] - firstPalace[1]) / proportion + pastPositionTransform[1]

            ];

            /*变化*/


            changeTransform(this,proportion, lastPositionTransform[0], lastPositionTransform[1]);



            //test1(lastPositionTransform[0]);

            //test2(proportion)

            /*禁止浏览器默认事件*/
            evt.preventDefault();

            evt.stopPropagation()



        }

        /*多于两个手指打开*/
        else if (evt.touches.length == 2 && (howMove == 2 || howMove == 0)) {

            howMove = 2;

            var touchsX = [evt.touches[0].pageX, evt.touches[1].pageX];

            var touchsY = [evt.touches[0].pageY, evt.touches[1].pageY];

            /*保存最新的触摸中间点位置*/
            lastPalace = [(touchsX[0] + touchsX[1]) / 2, (touchsY[0] + touchsY[1]) / 2];

            /*控制放大缩小*/
            /*两手指间的距离*/
            lastDistance = Math.sqrt(
                Math.pow(touchsX[0] - touchsX[1], 2),

                Math.pow(touchsY[0] - touchsY[1], 2)
            );

            /*判断是否是第一次出现两个手指，是的话就缓存该位置*/
            if (isSaveDistance && lastDistance > 0) {

                /*自锁*/
                isSaveDistance = false;

                /*保存第一次位置*/
                firstDistance = lastDistance;

                /*保存第一次居中位置*/
                firstPalace = lastPalace;

                /*如果有上次改变值，则作为乘积，缓存*/
                if (this.getAttribute('data-proportio')) {

                    /*查找上一次的缩放比例*/
                    pastProportion = this.getAttribute('data-proportio');

                    /*上一次x轴偏移*/
                    pastPositionTransform[0] = parseInt(this.getAttribute('data-left'));

                    /*上一次y轴偏移*/
                    pastPositionTransform[1] = parseInt(this.getAttribute('data-top'))

                }

            }

            /*比例=(第一次次距离+增量*比例)/第一次次距离*乘积*/
            proportion = (firstDistance + (lastDistance - firstDistance) / 3 * 2) / firstDistance * pastProportion;

            /*比例控制*/
            proportion = (function (num) {

                /*安卓没有弹性收回*/
                if (browser.os.iOS) {
                    /*大于1 减弱*/
                    if (num < 1) {

                        num = 1 - (1 - num ) / 2;

                    }

                    else if (num > 3.5) {

                        num = 2.833;

                    }

                    /*大于2.5 减弱*/
                    else if (num > 2.5) {

                        num = 2.5 + (num - 2.5 ) / 3;

                    }


                    return num
                }

                else {

                    return controlNum(num)

                }

            })(proportion);

            /*储存上一次比例*/
            this.setAttribute('data-proportio', proportion);

            //test1(proportion);

            /*保存上一次位置=（本次位置-第一次位置）/放大缩小系数*/
            lastPositionTransform = [

                (lastPalace[0] - firstPalace[0]) / proportion + pastPositionTransform[0],

                (lastPalace[1] - firstPalace[1]) / proportion + pastPositionTransform[1]

            ];


            /*变化*/
            changeTransform(this,proportion, lastPositionTransform[0], lastPositionTransform[1]);

            //test1(lastPositionTransform[0]);

            //test2(proportion)

            /*禁止浏览器默认事件*/
            evt.preventDefault();

            evt.stopPropagation()


        }

    }


    /*触摸结束方法*/
    function imgTouchEnd(evt) {

        var _this = this;

        /*最后的数据进行调整*/
        proportion = controlNum(proportion);

        lastPositionTransform[0] = controlTransformX(lastPositionTransform[0], _this);

        lastPositionTransform[1] = controlTransformY(lastPositionTransform[1], _this);

        /*变化函数*/
        change(_this,proportion, lastPositionTransform[0], lastPositionTransform[1]);

        function change(ele,num, positionLeft, positionTop) {

            changeTransform(ele,num, positionLeft, positionTop);

            _this.setAttribute('data-proportio', num);

            _this.setAttribute('data-left', positionLeft);

            _this.setAttribute('data-top', positionTop);

            _this.className += ' move'

        }

    }

    /*处理数字方法*/
    function controlNum(num) {

        if (num < 1) {

            return 1

        }

        /*小于2.5收回*/
        else if (num > 2.5) {

            return 2.5

        }

        return num

    }

    /*x轴*/
    function controlTransformX(num, ele) {

        var offsetWidth = document.documentElement.clientWidth;

        /*实际元素高度*/
        var thisWidth = ele.clientWidth * controlNum(proportion);


        /*整体居中*/
        if (offsetWidth >= thisWidth) {

            return 0

        }

        else {

            var distance = ele.getBoundingClientRect().left;

            /*左边没有贴合*/
            if (distance > 0) {


                if(distance > offsetWidth /3 ){


                    leftFn();




                }

                return (thisWidth - offsetWidth) / 2 / proportion

            }

            /*右边没有贴合*/
            else if (offsetWidth - (thisWidth + distance) > 0) {


                if(offsetWidth - (thisWidth + distance) > offsetWidth /3 ){

                    rightFn();




                }

                return -(thisWidth - offsetWidth) / 2 / proportion

            }


            else {

                return num

            }

        }


    }


    //y轴回正
    function controlTransformY(num, ele) {

        /*页高*/
        var offsetHeight = document.documentElement.clientHeight;

        /*实际元素高度*/
        var thisHeight = ele.clientHeight * controlNum(proportion);


        /*整体居中*/
        if (offsetHeight >= thisHeight) {

            return 0

        }

        else {

            var distance = ele.getBoundingClientRect().top;

            /*上部没有贴合*/
            if (distance > 0) {

                return (thisHeight - offsetHeight) / 2 / proportion

            }

            /*下部没有贴合*/
            else if (offsetHeight - (thisHeight + distance) > 0) {

                return -(thisHeight - offsetHeight) / 2 / proportion

            }

            else {

                return num

            }

        }

    }

    /*通用放大缩小方法*/
    function changeTransform(ele,proportionNum, transformLeft, transformTop) {


        var thisTransformDetail = "scale3d(" + proportionNum + "," + proportionNum + ",1) translate3d(" + transformLeft + "px, " + transformTop + "px , 0)";

        ele.style.transform = thisTransformDetail;

        ele.style.webkitTransform = thisTransformDetail;


    }

}

/*图片手动轮播*/
var productInfoPlay={

    "figer":{

        "ischange":true,

        "ismove":true //true表示左右移动，执行轮播的JS，false表示上下移动，不执行轮播的JS

    },
    /*初始化,没有动画弹出*/
    init:function(details){

        var _this=this;

        if(!details){//如果details未输入，则防止报错
            details={};
        }

        _this.moveEle = details.moveEle || 'allimg';//当前显示的banner图片的整个div,class选择器

        _this.moveEleParent=details.moveEleParent||'demo1';//当前显示的整个框架

        _this.scaleEleParent=details.scaleEleParent||'jdshow_center_center';

        _this.allShowEle=details.allShowEle||false;//整个弹出的元素框架,class选择器，默认没有

        _this.fn=details.fn||0;

        _this.thisPosition = 0;//初始化现在在第几个页面

        _this.moveDistanceX = 0;//x方向移动的距离(一根手指)

        _this.moveDistanceY=0;//y方向移動的距離

        setTimeout(function () {

            //当前页面Banner部分绑定事件
            _this.initPointEle(_this.moveEleParent);//初始化点点（参数一当前移动元素的父元素）

        },100);


        _this.moveEvent();//元素绑定事件（参数一当前移动元素）


        if( _this.allShowEle){//如果存在弹出的页面

          //  _this.initPointEle( _this.allShowEle);//初始化点点（参数一当前移动元素的父元素）

            document.getElementsByClassName( _this.allShowEle)[0].getElementsByClassName( _this.moveEle)[0].innerHTML=document.getElementsByClassName( _this.moveEle)[0].innerHTML;//获取所有的图片=主体内容图片部分

            document.getElementsByClassName('img_content')[0].addEventListener('touchmove',function(e){e.preventDefault()},false);//禁止阴影部分滑动

            var BannerEle=document.getElementsByClassName( _this.moveEle)[0].getElementsByClassName(_this.scaleEleParent);

            for(var i=0;i<BannerEle.length;i++){

                BannerEle[i].getElementsByTagName('div')[0].className=""
            }

            var hideBannerEle=document.getElementsByClassName('delete_banner')[0];//关闭弹出层元素；

            hideBannerEle.addEventListener('click',function(){

                var thisScaleEle=document.getElementsByClassName('jd_banner_touch');

                for(var i=0;i<thisScaleEle.length;i++){

                    thisScaleEle[i].style.transform="scale3d(1,1,1) translate3d(0,0,0)";
                }

                document.getElementsByClassName( _this.allShowEle)[0].style.display='none';

                document.getElementsByTagName("body")[0].style.overflow="";//页面可以滚动

                document.getElementsByTagName("html")[0].style.overflow="";//页面可以滚动

                document.getElementsByTagName("body")[0].style.height="100%";

                document.getElementsByTagName("html")[0].style.height="100%";



            },false);


            initBannerTouch({

                leftFn:function () {

                   // _this.movePosition(1);//(向右滑动)

                },

                rightFn:function (e) {

                 //   _this.movePosition(-1);//(向左滑动)

                }

            })
        }


    },


    /*元素绑定事件*/
    moveEvent:function(){//参数一为移动元素的class值，参数二是点点的父元素

        var _this=this;

        var moveEle=document.getElementsByClassName(_this.moveEle);//banner轮播图

        var thisNum = moveEle[0].getElementsByClassName(_this.scaleEleParent).length - 1;

        var thisWindowWidth = window.innerWidth;//屏幕可视窗口宽度

        var firstTouchesClientX; //初次点击的位置X坐标

        var firstTouchesClientY;//初次点击的位置Y坐标

        var moveTouchesClientX;//移动一段距离后，停止点的位置(X)

        var moveTouchesClientY;//移动一段距离后，停止点的位置(Y)

        var lastDis=0;//前一次距离

        var newDis=0;//最新的距离

        var lastDistanceSpeed=0;//最后一次速度


            moveEle[0].addEventListener('touchstart',function(event){

                var evt = event ? event : window.event;

                if(evt.touches.length==1){

                    _this.moveDistanceX=0;

                    _this.moveDistanceY=0;

                    _this.figer.ischange=true;//初始化可移动

                    getFirstPosition(event);

                    if(this.className=""+_this.moveEle+" contentchange"){

                        this.className=""+_this.moveEle+""
                    }
                }




            },false);//获取初始位置

            moveEle[0].addEventListener('touchmove',function(event){

                var evt = event ? event : window.event;

                if(evt.touches.length==1){

                    lastDistanceSpeed=getLastPosition(event);

                    if(_this.figer.ischange){

                        if(Math.abs(_this.moveDistanceY)>Math.abs(_this.moveDistanceX)){//如果在Y軸方向移動的距離大於X軸方向，則不轮播

                            _this.figer.ismove=false
                        }else {

                            _this.figer.ismove=true
                        }

                        _this.figer.ischange=false;//进行锁定一次，
                    }

                    if( _this.figer.ismove){//判断为左右移动时，即可运行相应的JS

                        evt.preventDefault();//阻止浏览器的默认行为

                        evt.stopPropagation();

                        if(((_this.thisPosition==0)&&_this.moveDistanceX>0)||((_this.thisPosition==-thisNum) &&_this.moveDistanceX<0)){//第一页，滑动会产生一个阻力
                            _this.moveDistanceX=_this.moveDistanceX/3;
                        }

                        _this.changeTranslate(parseFloat(_this.thisPosition*thisWindowWidth)+parseFloat(_this.moveDistanceX) + 'px');//移动中
                    }

                }



            },false);

            moveEle[0].addEventListener('touchend',function(event){

                var evt = event ? event : window.event;

                if(evt.changedTouches.length==1){

                    if(_this.figer.ismove){

                        this.className= ""+_this.moveEle+" contentchange";//添加class,带有Transition的属性

                        if(this.parentElement==document.getElementsByClassName(_this.moveEleParent)[0]){//如果在banner轮播，

                            if(((_this.thisPosition==-thisNum) &&_this.moveDistanceX<0)&&(Math.abs(_this.moveDistanceX)>55)){

                                if(_this.fn){//当前处于第4页，并且继续滑动，执行相应的脚本

                                    _this.fn()
                                }
                            }
                        }


                        if(Math.abs(_this.moveDistanceX)>(thisWindowWidth/3)||lastDistanceSpeed>6){//当手指的移动距离大于屏幕的1/3时，变化

                            _this.movePosition(_this.moveDistanceX);

                        }else {

                            _this.changeTranslate(parseFloat(_this.thisPosition*thisWindowWidth) + 'px');//变化到指定位置

                        }

                        _this.transitionFn(transitionMoveEndFn);//平滑过渡事件

                    }





                }



            },false);

            //弹出层
            moveEle[0].addEventListener('click',function(){_this.showNewBanner();},false);



        //初始移送的位置
        function getFirstPosition(event) {

            var evt = event ? event : window.event;

            firstTouchesClientX = parseFloat(evt.touches[0].clientX);//当前点击事件距离屏幕左边的距离(初始位置-X);

            firstTouchesClientY=parseFloat(evt.touches[0].clientY);//当前点击事件距离屏幕左边的距离(初始位置-X);

            lastDis=newDis=firstTouchesClientX;

        }

        //手指即将离开的位置
        function getLastPosition(event) {

            var evt = event ? event : window.event;

            moveTouchesClientX = parseFloat(evt.changedTouches[0].clientX);//末尾位置(X);

            moveTouchesClientY = parseFloat(evt.changedTouches[0].clientY);//末尾位置(Y);

            lastDis=newDis;

            newDis=moveTouchesClientX;

            _this.moveDistanceX = moveTouchesClientX - firstTouchesClientX;//x軸方向最终移动的距离（第一根手指）

            _this.moveDistanceY = moveTouchesClientY - firstTouchesClientY;//Y軸方向最终移动的距离（第一根手指）

            return Math.abs(newDis-lastDis);

        }

        //绑定平滑过渡后的方法
        function transitionMoveEndFn(){

            for( var i=0;i<moveEle.length;i++){

                moveEle[i].className=""+_this.moveEle+"";//移除class,带有Transition的属性

                moveEle[i].removeEventListener('transitionend', transitionMoveEndFn, false);

                moveEle[i].removeEventListener('transitionend', transitionMoveEndFn, false);
            }

        }

    },

    /*元素移动*/
    movePosition:function(position){//参数一当前移动的位置方向
        var _this=this;

        var thisWindowWidth = window.innerWidth;//屏幕可视窗口宽度

        var moveEle=document.getElementsByClassName(_this.moveEle);//包裹所有主体中的banner图片的父级元素

        var thisNum = moveEle[0].getElementsByClassName(_this.scaleEleParent).length - 1;

        var PointParent=document.getElementsByClassName('allpoint');//点点的父元素

        var BannerPoint= PointParent[0].getElementsByTagName('span');//banner中的点点

        var newBannerPonit=PointParent[PointParent.length-1].getElementsByTagName('span');//弹出来的点点


        //如果向右滚动，则不能超过最大图片个数
        if (parseFloat(position) < 0) {

            _this.thisPosition > -thisNum ? _this.thisPosition-- : _this.thisPosition = -thisNum;

        }

        //如果向左边滚动，不能超过最左边
        else if (parseFloat(position) > 0) {

            _this.thisPosition < 0 ? _this.thisPosition++ : _this.thisPosition = 0;
        }

        _this.changeTranslate(thisWindowWidth * this.thisPosition + 'px');//变化到指定位置




        if(BannerPoint){
            //变化点点的位置

            for(var i=0;i<PointParent.length;i++){

                PointParent[i].getElementsByClassName('showpoint')[0].className="";
            }

            BannerPoint[-this.thisPosition].className="showpoint";

            newBannerPonit[-this.thisPosition].className="showpoint"

        }


    },

    /*添加元素*/
    initPointEle:function(pointParentEle){//参数是点点以及banner的父元素,以及点点父元素的class值

        var _this = this;

        var AllBannerImg=document.getElementsByClassName( _this.moveEle)[0].getElementsByClassName(_this.scaleEleParent);//显示的banner图片

        var pointEle="";//点点元素

        for(var i=0;i<AllBannerImg.length;i++){


            if (i == 0) {

                pointEle += '<span class="showpoint"></span>';
            }

            else {

                pointEle += '<span></span>';

            }

        }

        addnode("div",pointEle,'allpoint');

        function addnode(tag, innerHtml, className){

            var obj = document.createElement(tag);

            if (className) {

                obj.className = className
            }

            obj.innerHTML = innerHtml;

            document.getElementsByClassName(pointParentEle)[0].appendChild(obj);
        }

    },

    //元素位置变化的方法
    changeTranslate:function(num1){

        var _this=this;

        var moveEle=document.getElementsByClassName(_this.moveEle);

        for( var i=0;i<moveEle.length;i++){

            moveEle[i].style.transform = 'translateX(' + num1 + ')';

            moveEle[i].style.webkitTransform = 'translateX(' + num1 + ')';

        }

    },

    //元素平滑过渡的方法
    transitionFn:function(myFn){

        var _this=this;

        var moveEle=document.getElementsByClassName(_this.moveEle);

        for( var i=0;i<moveEle.length;i++){

            moveEle[i].addEventListener("TransitionEnd",myFn,false);

            moveEle[i].addEventListener("webkitTransitionEnd",myFn,false);

        }

    },

    //判断有没有弹出层
    showNewBanner:function(){

        var _this=this;

        var thisWindowHeight=window.innerHeight;

        if(_this.moveDistanceX==0&&_this.moveDistanceY==0&&_this.allShowEle){//当没有任何移动，即点击，出现弹出图片

                document.getElementsByClassName( _this.allShowEle)[0].style.display='block';//弹出元素显示

                document.getElementsByTagName("body")[0].style.height=""+thisWindowHeight+"px";
                document.getElementsByTagName("html")[0].style.height=""+thisWindowHeight+"px";

                document.getElementsByTagName("body")[0].style.overflow="hidden";//页面禁止滚动
                document.getElementsByTagName("html")[0].style.overflow="hidden";//页面禁止滚动

        };


    }

};

