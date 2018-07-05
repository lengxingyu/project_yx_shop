/**
 * Created by ZHUANGYI on 2017/11/29.
 */
var addressChoose = {

    //页面进入后tab切换自锁
    o:1,

    //父页面监听事件
    i:1,

    //初始化渲染
    z:1,

    run: function (details) {

        var _this=this;

        //初始化数据
        var thisPointCity,thisId,thisWrightHtml,thisFn,thisCityAll=[],thisCityId=[];

        //初始化id
        var thisStartId = details.startId;

        //初始化Name
        var thisStartName = details.startName;

        //是否需要初始化选择
        var isChoosen=thisStartId && thisStartName && thisStartName.length == thisStartName.length;

        //是否有值
        if(isChoosen){

            //数据代入前面的address
            thisCityAll=thisStartName;

            thisCityId=thisStartId;
        }

        //tab切换自锁
            if(_this.o){

                //异步加载
                xhr(details,0,1,0);
                //tab切换
                changeClass();

                _this.o = 0;

            }

        //切换样式名称
        function changeClass() {

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



                for (var i = 0; i < firstEle.length; i++) {

                    firstEle[i].addEventListener('click', clickEle, false)

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

        }

        //异步加载数据 thisNum 为areaid变化数值 returnNum为1初始化 addressNum是每个address是第几个
        function xhr (xDetails,thisNum,returnNum,addressNum) {

            var api = xDetails.api || 0;

            var type = xDetails.type || 'get';

            //传入前半部分url
            var thisUrl = xDetails.yourUrl || 'http://118.242.19.26:188';

            //接口地址 thisNum为id
            var addressUrl = thisUrl+'/jf_market_jd_server/api/address/getArea?areaId='+ thisNum;




            //请求数据
            var xhr = function () {

                if (window.XMLHttpRequest) {

                    return new XMLHttpRequest();

                }
                else {

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


                            var addressEles = document.getElementById('jd_address_select').getElementsByClassName('address');

                            //如果为1的时候用这个方法
                            if(returnNum==1){

                                //第一次 渲染【0】dom对象
                                fn(xhr.responseText,xDetails);

                                //如果有初始化在执行
                                if(isChoosen){

                                    addAddressShow(addressNum)

                                }




                            }
                            //如果为2的时候用这个方法
                            else if(returnNum==2){

                                var data=JSON.parse(xhr.responseText).data;

                                if(data){

                                    addLi(addressEles[addressNum+1],data);

                                    addAddressShow(addressNum+1)

                                }

                            }
                            //每一次点击渲染对象
                            else {

                                var data=JSON.parse(xhr.responseText).data;

                                if(data){

                                    addLi(addressEles[addressNum+1],data);

                                }

                                changeNewTab(addressNum,data);


                            }

                            //为address添加show
                            function addAddressShow(addressNum) {

                                //每一个address下的p元素
                                var pEles = addressEles[addressNum].getElementsByTagName('p');

                                //遍历一下p元素
                                for(var i=0;i<pEles.length;i++){

                                    //是否对应areaId
                                    if(thisStartId[addressNum]==pEles[i].getAttribute('areaId')){

                                        //找到就不用再找了
                                        break

                                    }

                                }

                                //得到需要的那个p给他加上p_show
                                pEles[i].className = 'p_show';

                            }

                        }

                        else {

                            console.log('读取失败');

                        }
                        break;
                }
            };

            xhr.open(type, addressUrl);

            xhr.send(null);

        }

        //在address中生成列表 faEle-哪个address allData-加载的数据
        function addLi(faEle, allData) {

            var thisDomH = '<p areaId="';

            var thisDomM = '">';

            var thisDomB = '</p>';

            var writeDom = '';

            for (var i = 0; i < allData.length; i++) {

                //代入areaId
                writeDom += thisDomH +  allData[i].areaId + thisDomM + allData[i].name + thisDomB

            }

            faEle.innerHTML = writeDom;

            var allP = faEle.getElementsByTagName('p');

            for (var j = 0; j < allP.length; j++) {

                allP[j].addEventListener('click', clickFn, false)

            }

            /*每个元素点击事件*/
            function clickFn() {


                thisPointCity=this.innerHTML;//保存现在点击的城市

                thisId =this.getAttribute('areaid');//保存现在点击的城市的id

                //console.log('p '+thisPointCity);

                //console.log(this);


                if (this.parentNode.getElementsByClassName('p_show')[0]) {

                    this.parentNode.getElementsByClassName('p_show')[0].removeAttribute('class');

                }

                this.className = 'p_show'

            }

        }

        //顶部tab页切换 在数据加载之后执行
        function changeNewTab(j,data) {

            var tabCity = document.getElementById('jd_address_select').getElementsByClassName('top_address')[0].getElementsByTagName('div');

            var allTab = document.getElementById('jd_address_select').getElementsByClassName('address');

            thisCityAll[j] = thisPointCity;

            thisCityId[j] = thisId;

            //console.log('tab '+thisPointCity);

            thisCityAll=thisCityAll.slice(0,j+1);

            thisCityId=thisCityId.slice(0,j+1);

            tabCity[j].innerHTML = thisPointCity;

            tabCity[j].setAttribute('areaId',thisId);

            tabCity[j].removeAttribute('class');


            if (data) {

                document.getElementById('jd_address_select').getElementsByClassName('show')[0].className='address';

                tabCity[j + 1].innerHTML = '请选择';

                tabCity[j + 1].className = 'show';

                allTab[j + 1].className += ' show';


            }

            else {


                var thisInnerHtml='';

                //最后一个tab模块添加show
                tabCity[j].className = 'show';

                for (var x = 0; x < thisCityAll.length; x++) {

                    thisInnerHtml += thisCityAll[x];

                    if(x!=thisCityAll.length-1) {

                        thisInnerHtml += '，'

                    }

                }

                thisWrightHtml.innerHTML=thisInnerHtml;

                _this.addressCity = thisCityAll;

                _this.addressCityId = thisCityId;


                //console.log(thisCityId);

                setTimeout(function () {

                    thisFn();

                },300)



            }
            //切换tab

        }

        //渲染数据
        function fn(thisJson,details) {

            thisWrightHtml = details.targetDom;

            thisFn = details.fn;

            var ele = document.getElementById('jd_address_select');

            var data = JSON.parse(thisJson).data;

            addLi(ele.getElementsByClassName('address')[0], data);

            var allTab = ele.getElementsByClassName('address');


            if(_this.i) {

                for (var i = 0; i < allTab.length; i++) {

                    allTab[i].addEventListener('click', fatherEleClick)

                }

                _this.i=0

            }

            /*每个父切换元素*/
            function fatherEleClick(evt) {

                if (this.className.indexOf('show') > -1) {

                    for (var j = 0; j < allTab.length; j++) {

                        if (this == allTab[j]) {

                            break

                        }

                    }


                        /*渲染下一个列表*/

                        var thisNum = evt.target.getAttribute('areaId');


                        //如果areaId有数值
                        if (thisNum) {

                            xhr(details, thisNum, 0, j);

                        }

                }

            }

        }



        //导入tab的数据
        (function(){


            //判断id和name有没有值鹅且两个长度相等

            //z==1的时候执行 方法最后赋值为0 只执行一次

            if(_this.z && isChoosen){

                var fatEle = document.getElementById('jd_address_select');

                var tabEles = fatEle.getElementsByClassName('top_address')[0].getElementsByTagName('div');

                var addressEles = fatEle.getElementsByClassName('address');

                //tab部分去掉第一个show 给最后一个加上show
                tabEles[0].className = '';

                tabEles[thisStartName.length-1].className = 'show';

                //address部分去掉第一个show 给最后一个加上show
                addressEles[0].className = 'address';

                addressEles[thisStartName.length-1].className += ' show';

                //遍历传入id的长度
                for(var i=0;i<thisStartName.length;i++){

                    //将name赋值到tab中
                    tabEles[i].innerHTML = thisStartName[i];
                    //给每个tab加上areaid
                    tabEles[i].setAttribute('areaId',thisStartId[i]);
                    //异步加载每个数据
                    xhr(details, thisStartId[i], 2, i);
                }

                _this.z = 0;

            }

        })();

    }

};