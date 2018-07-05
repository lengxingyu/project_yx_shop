/**
 * Created by Administrator on 2017/6/7.
 */
var shoppingCart = {

    changeX:1,

    changeY:1,
    /*加载方法*/
    xhr: function (details) {

        var _this = this;

        var api = details.api || 0;

        var type = details.type || 'get';

        var xhr = function () {
            if (window.XMLHttpRequest) {
                return new XMLHttpRequest();
            } else {
                return new ActiveObject('Micrsorf.XMLHttp');
            }
        }();

        xhr.onreadystatechange = function () {
            switch (xhr.readyState) {
                case 0 :
                    // console.log(0, '未初始化....');
                    break;
                case 1 :
                    /*console.log(1, '请求参数已准备，尚未发送请求...');*/
                    break;
                case 2 :
                    /*console.log(2, '已经发送请求,尚未接收响应');*/
                    break;
                case 3 :
                    /*console.log(3, '正在接受部分响应.....');*/
                    break;
                case 4 :
                    /*console.log(4, '响应全部接受完毕');*/
                    if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304) {

                        _this.fn(xhr.responseText,details)

                    }

                    else {

                        console.log('读取失败');

                    }
                    break;
            }
        };

        xhr.open(type, api);

        xhr.send(null);

    },

    run: function (details) {



        this.xhr(details);

        this.changeClass(details)

    },

    //切换样式名称
    changeClass: function () {

        var allEle = document.getElementById('jd_address_select');

        var firstEle = allEle.getElementsByClassName('top_address')[0].getElementsByTagName('div');

        if(allEle.getElementsByClassName('show')[0]){

            clearClass(1)
        }

        firstEle[0].innerHTML='请选择';

        if(firstEle[0].className.indexOf('show')==-1) {

            firstEle[0].className = 'show';

        }

        if(allEle.getElementsByClassName('address')[0].className.indexOf('show')==-1) {

            allEle.getElementsByClassName('address')[0].className += ' show';

        }

        if(this.changeX) {

            for (var i = 0; i < firstEle.length; i++) {

                firstEle[i].addEventListener('click', clickEle, false)

            }

            this.changeX=0;

        }

        function clickEle() {

            clearClass(2);

            for (var j = 0; j < firstEle.length; j++) {

                if (this == firstEle[j]) {

                    break

                }

            }

            this.className = 'show';

            allEle.getElementsByClassName('address')[j].className += ' show';


        }

        function clearClass(num) {

            for (var i = 0; i < num; i++) {

                allEle.getElementsByClassName('show')[0].className = allEle.getElementsByClassName('show')[0].className.replace('show', '');

            }

        }

    },

    /*渲染地址列表*/
    fn: function (thisJson,details) {

        var thisWrightHtml = details.targetDom;

        var thisFn = details.fn;

        var ele = document.getElementById('jd_address_select');

        var data = JSON.parse(thisJson).data;

        var tabCity = ele.getElementsByClassName('top_address')[0].getElementsByTagName('div');

        for(var i=1;i<tabCity.length;i++){

            tabCity[i].innerHTML=""

        }

        addLi(ele.getElementsByClassName('address')[0], data);

        function addLi(faEle, allData) {

            var thisDomH = '<p data-li="';

            var thisDomM = '">';

            var thisDomB = '</p>';

            var writeDom = '';


            for (var i = 0; i < allData.length; i++) {

                writeDom += thisDomH + i + thisDomM + allData[i].name + thisDomB

            }

            faEle.innerHTML = writeDom;

            var allP = faEle.getElementsByTagName('p');

            for (var j = 0; j < allP.length; j++) {

                allP[j].addEventListener('click', clickFn, false)

            }

        }

        /*每个元素点击事件*/
        function clickFn() {

            if (this.parentNode.getElementsByClassName('p_show')[0]) {

                this.parentNode.getElementsByClassName('p_show')[0].removeAttribute('class');

            }

            this.className = 'p_show'

        }


        var allTab = ele.getElementsByClassName('address');

        if(this.changeY) {

        for (var i = 0; i < allTab.length; i++) {

            allTab[i].addEventListener('click', fatherEleClick)

        }

            this.changeY=0;

        }

        var allCityPoint = [];

        var thisCityAll = [];

        //chooseAdressId=[];

        /*每个父切换元素*/
        function fatherEleClick(evt) {

            if (this.className.indexOf('show') > -1) {

                for (var j = 0; j < allTab.length; j++) {

                    if (this == allTab[j]) {

                        break

                    }

                }

                /*渲染下一个列表*/

                var thisNum = evt.target.getAttribute('data-li');

                allCityPoint[j] = thisNum;

                allCityPoint=allCityPoint.slice(0,j+1);

                var thisData = data;

                var thisCity;

                for (var z = 0; z <= j; z++) {

                    thisCity = thisData[allCityPoint[z]];

                    thisData = thisCity.child;

                    if(!thisData)break

                }



                /*修改tab*/

                var tabCity = ele.getElementsByClassName('top_address')[0].getElementsByTagName('div');

                thisCityAll[j] = thisCity.name;

                thisCityAll=thisCityAll.slice(0,j+1);

                tabCity[j].innerHTML = thisCity.name;

                tabCity[j].removeAttribute('class');


                if (thisData) {

                    tabCity[j + 1].innerHTML = '请选择';

                    tabCity[j + 1].className = 'show';

                    allTab[j + 1].className += ' show';

                    this.className = this.className.replace(' show', '');

                    addLi(allTab[j + 1], thisData);

                }

                else {

                    var thisInnerHtml='';

                    for (var x = 0; x < thisCityAll.length; x++) {

                        thisInnerHtml += thisCityAll[x];

                        if(x!=thisCityAll.length-1) {

                            thisInnerHtml += '，'

                        }



                    }

                    thisWrightHtml.innerHTML=thisInnerHtml;


                    chooseAdressId=(function(){


                        var allNum=[];

                        var thisData=data;


                        for(var i=0;i<allCityPoint.length;i++) {

                            allNum[i]=thisData[allCityPoint[i]].id;

                            thisData=thisData[allCityPoint[i]].child;

                        }

                        return allNum;

                        //地址数据data;


                    })();


                    setTimeout(function () {

                        thisFn();




                    },300)



                }
                //切换tab


            }

        }

    },





};


