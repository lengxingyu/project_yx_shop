/**
 * Created by ZHUANGYI on 2017/9/1.
 */


//iframe弹出框

/*var productIframe = {

    iframePopUp: function () {


        var thisEle = document.getElementById('iframDemo');

        var thisEleCancel = thisEle.getElementsByClassName('iframe_cancel')[0];

        //点击【看京东价】 出现模态框

            if (thisEle.className.indexOf('show') == -1) {

                iframeShow();
            }
            else {
                iframeHide()
            }

        clickThrough();

        //点穿问题
        function clickThrough() {

            var _thisScrollEle = document.getElementById('iframDemo').getElementsByClassName('iframebox')[0];

            var startY, endY, distance;//开始距离、移动距离

            _thisScrollEle.addEventListener('touchstart', touchStartEle, false);

            _thisScrollEle.addEventListener('touchmove', reachEdge, false);


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


                    //如果距离为正数 则向上滑动时候 禁止浏览器事件

                    if (distance > 0) {

                        event.preventDefault();

                    }

                }

                else if (Math.abs(parseFloat(eleScrollHeight)) == 0) {

                    //如果距离为负数 则向下滑动 禁止浏览器事件

                    if (distance < 0) {

                        event.preventDefault();

                    }


                }

            }


        }



        //模态框消失
        thisEleCancel.addEventListener('click', iframeHide, false);

        function iframeShow() {

            thisEle.style.display = 'block';

            setTimeout(function () {

                if (thisEle.className.indexOf('show') == -1) {

                    thisEle.className += ' show'
                }

            }, 10);



            iFrameHeight();

            //固定iframe宽高 专递url值
            function iFrameHeight() {

                var ifm = document.getElementById("iframe");

                var viewJd = document.getElementById('view_jd');

                var btnEle = document.getElementById('jumpBtn');

                if (ifm) {


                    ifm.height = 1500;

                    ifm.width = document.body.scrollWidth;

                    ifm.src = viewJd.getAttribute('data-src');

                    btnEle.href = viewJd.getAttribute('data-src');

                    //ifm.src="https://item.m.jd.com/product/10211831816.html";


                }

            }


        }

        function iframeHide() {


            if (thisEle.className.indexOf('show') > -1) {

                //transitionMove(thisEle);

                thisEle.style.display = 'none';

                thisEle.className = thisEle.className.replace(' show', '')

            }


            function transitionMove(ele) {

                // Safari 3.1 到 6.0 代码
                ele.addEventListener("webkitTransitionEnd", MFunction);
                // 标准语法
                ele.addEventListener("transitionend", MFunction);

                function MFunction() {

                    ele.style.display = 'none';
                    // Safari 3.1 到 6.0 代码
                    ele.removeEventListener("webkitTransitionEnd", MFunction);
                    // 标准语法
                    ele.removeEventListener("transitionend", MFunction);


                }


            }

        }


    }
};*/

var jfIframe = function (details) {

    if(!details){

        details = {}
    }

    this.details = details;

    var thisEle = document.getElementById(this.details.ele);

    clickThrough();

    //点穿问题
    function clickThrough() {

        var _thisScrollEle = document.getElementById('iframDemo').getElementsByClassName('iframebox')[0];

        var thisTop = thisEle.getElementsByClassName('iframe_title')[0];

        var startY, endY, distance;//开始距离、移动距离

        _thisScrollEle.addEventListener('touchstart', touchStartEle, false);

        _thisScrollEle.addEventListener('touchmove', reachEdge, false);

        thisTop.addEventListener('touchmove',windowBanEvent.Canceling,false);


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


                //如果距离为正数 则向上滑动时候 禁止浏览器事件

                if (distance > 0) {

                    event.preventDefault();

                }

            }

            else if (Math.abs(parseFloat(eleScrollHeight)) == 0) {

                //如果距离为负数 则向下滑动 禁止浏览器事件

                if (distance < 0) {

                    event.preventDefault();

                }


            }

        }


    }


    thisEle.getElementsByClassName('iframe_cancel')[0].addEventListener('click', clickEven.bind(this), false);



    function clickEven() {

        this.hide();

    }

    function addEvent(ele) {

        var allEvent=['touchstart','touchmove','touchend'];

        for(var i=0;i<allEvent.length;i++) {

            ele.addEventListener(allEvent[i],eventBan,false)

        }

    }

    function eventBan(e) {


        window.event ? window.event.returnValue = false : e.preventDefault();


    }
};

jfIframe.prototype.show = function (details) {


    if(details){

        details.fn();

    }


    var thisEle = document.getElementById(this.details.ele);

    thisEle.style.display = 'block';

    setTimeout(function () {

        if (thisEle.className.indexOf('show') == -1) {

            thisEle.className += ' show'

        }

    }, 1);
    iFrameHeight();

    //固定iframe宽高 专递url值
    function iFrameHeight() {

        var ifm = document.getElementById("iframe");

        var viewJd = document.getElementById('view_jd');

        //var btnEle = document.getElementById('jumpBtn');

        if (ifm) {


            ifm.height = 2000;

            ifm.width = document.body.scrollWidth;

            ifm.src = viewJd.getAttribute('data-src');

            //btnEle.href = viewJd.getAttribute('data-src');

            //ifm.src="https://item.m.jd.com/product/10211831816.html";


        }

    }



};

jfIframe.prototype.hide = function () {

    var thisEle = document.getElementById(this.details.ele);

    /*document.body.removeEventListener('touchmove', this.ban, true);*/

    thisEle.style.display = 'none';

    if (thisEle.className.indexOf('show') > -1) {

        //transitionMove(thisEle);

        thisEle.className = thisEle.className.replace(' show', '')

    }

    windowBanEvent.unbundling();//解绑页面禁止事件

    function transitionMove(ele) {

        // Safari 3.1 到 6.0 代码
        ele.addEventListener("webkitTransitionEnd", MFunction);
        // 标准语法
        ele.addEventListener("transitionend", MFunction);

        function MFunction() {

            ele.style.display = 'none';
            // Safari 3.1 到 6.0 代码
            ele.removeEventListener("webkitTransitionEnd", MFunction);
            // 标准语法
            ele.removeEventListener("transitionend", MFunction);


        }


    }


};



