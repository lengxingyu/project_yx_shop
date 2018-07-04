/**
 * Created by ZHUANGYI on 2017/8/28.
 */

var jdShopSecKill = {


    viewMore: function () {

        var isFirstMove = 0;//记录第一次位置

        var thisELe = document.getElementById('viewMore');

        var PositionX, PositionXNew;

        //var jumpFn = 0;

        //if (details.jumpFn) {    //防止事件报错

        //jumpFn = details.jumpFn
        //}

        //在touchstart的时候初始化值
        thisELe.addEventListener('touchstart', touchStartEvent, false);


        thisELe.addEventListener('touchmove', function (e) {

            var _this = this;

            var eleScrollWidth = _this.scrollLeft;//此div横向滚动条的所在位置 603

            var thisEleWidth = _this.scrollWidth;//此div的实际宽度 1007

            var windowsWidth = _this.offsetWidth;//可视窗口的宽度 404

            var touch = e.touches[0];//获得手指的位置

            //判断滚动条的位置当他在0界点的时候

            //如果是安卓始终记录第一次的位置

            if (!isFirstMove && Math.abs(parseFloat(thisEleWidth) - parseFloat(eleScrollWidth + windowsWidth)) <= 2) {

                //获取滚动条到底是现在手机滑动的距离

                PositionX = touch.pageX;

                //console.log('PositionX'+PositionX)

                isFirstMove = 1;

            }

            //获取现在手机滑动的距离

            PositionXNew = touch.pageX;

            //console.log('PositionXNew'+PositionXNew)


        }, false);


        thisELe.addEventListener('touchend', touchEndEvent, false);


        function touchStartEvent() {

            //初始值为0
            PositionX = 0;

            isFirstMove = 0;

            //判断是否为ios
            if(browser.os.iOS){

                thisELe.style.overflow='';
            }



        }


        function touchEndEvent() {

            //如果有移动的值
            if (PositionX) {

                if (PositionXNew - PositionX < 15) {

                    //滚动条拉回顶部 ios

                    if(browser.os.iOS){

                        //滚动条返回顶部

                        thisELe.scrollLeft= 0;


                        thisELe.style.overflow='hidden';

                        setTimeout(function () {

                            thisELe.style.overflow='';

                        },10);

                    }


                    //跳转链接
                    var hrefEle = document.getElementById('jumpHrefView');

                    window.location.href = hrefEle.href


                }


            }

        }


    }


};

