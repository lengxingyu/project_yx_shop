/**
 * Created by ZHUANGYI on 2017/6/26.
 */

var jdCategoryPage = {

    clickTSortChange: function () {

        var fatherEle = document.getElementsByClassName('product_category_slide')[0];

        var allEle = fatherEle.getElementsByTagName('div');


        for (var i = 0; i < allEle.length; i++) {

            allEle[i].addEventListener('click', function () {

                var _this = this;

                /*选中高亮*/
                fatherEle.getElementsByClassName('select_sort')[0].className = fatherEle.getElementsByClassName('select_sort')[0].className.replace('select_sort', '');


                _this.className += ' select_sort';


                /*滚动条移动*/
                var eleHeight = _this.offsetTop;
                //元素到父元素的高度

                var screenHeight = window.innerHeight;
                //浏览器的高度

                var thisEleHeight = _this.offsetHeight;
                //点击元素的高度

                /*目标位置*/
                var distance = eleHeight - screenHeight / 2 + thisEleHeight / 2;

                /*现在滚动位置*/
                var thisScrollTop = _this.parentNode.scrollTop;

                /*平滑过渡*/

                var index = 0;

                /*每10毫秒执行一次*/
                var time = setInterval(timeSet, 10);

                /*执行方法*/
                function timeSet() {


                    //计数
                    index++;

                    /*每次增加1/30的差值*/
                    _this.parentNode.scrollTop += (distance - thisScrollTop) / 30;

                    /*三十次*/
                    if (index >= 30) {
                        clearInterval(time);

                    }

                }

                //this.parentNode.scrollTop = distance;


            }, false);


        }


    }
};

