/**
 * Created by ZHUANGYI on 2017/5/18.
 */

    /*loading的三种动画*/
var loadInnerHtml={

   'node':{

       'loadingSuccess':'<div class="loading_box"><div class="success_animation"><div class="success_animation_circle"></div><div class="success_animation_cloud"></div><div class="success_animation_line2"></div><div class="success_animation_line3"></div><div class="success_animation_right"></div><div class="m-box"><div class="m-duigou"></div></div><div class="success_animation_text showtext"></div></div></div>',

       'loading':'<div class="loading_box"><div class="jd_loading"><div class="loading_box jdshop_alignment_center"><div class="ball1"></div><div class="ball2"></div><div class="ball3"></div></div><div class="loading_animation_text showtext"></div></div></div>',

       'loadingFail':'<div class="loading_box"><div class="fail_animation"><div class="fail_animation_circle"></div><div class="fail_animation_cloud"></div><div class="fail_animation_line2"></div><div class="fail_animation_line3"></div><div class="fail_animation_wrong"></div><div class="fail_animation_text showtext"></div></div></div>'

   }
};

var jfShowTips = {

    //弱提示toast出现的方法
    //谯丹
    //2017.1.17
    toastShow: function (details) {

        var _this = this;

        if(!details){//如果details未输入，则防止报错
            
            details={};

        }

        var thisText = details.text || 'null';

        var thisInnerHtml = '<span>' + thisText.toString().replace(/&/g,'&amp;').replace(/>/g,'&gt;').replace(/</g,'&lt;').replace(/"/g,'&quot;') + '</span>';//插入元素的主题内容

        _this.toastRemove();//插入元素前，先删除一次，防止多次添加

        var className='';


        if(browser.os.iOS){//如果当前是IOS系统

            var thisActiveEle=document.activeElement;//当前获取焦点的元素

            if(thisActiveEle.tagName=='INPUT') {//如果当前元素是input

                var thisActiveEleType=thisActiveEle.getAttribute('type');//获取当前元素的type属性

                var inputType=['checkbox','radio','button','image','range','reset','submit','week'];//定义type类型不会发生变化的数组

                if(inputType.indexOf(thisActiveEleType)==-1){//如果当前type类型不存在，则添加Class

                    className='tip_input';
                }

            }

        }

        var thisAddToast = this.addNode('div', thisInnerHtml, 'tip_toast',className);//添加元素

        setTimeout(function () {//延迟2s后，自动删除

            _this.remove(thisAddToast)

        }, 2000);

    },

    //弱提示toast删除的方法
    //谯丹
    //2017.1.17
    toastRemove: function () {

        if (document.getElementById('tip_toast')) {//删除之前，先判断当前元素是否存在

            this.remove(document.getElementById('tip_toast'))

        }

    },

    //loading方法
    //陈羽翔
    //2017.2.3
    loadingShow:function (details) {

        var _this=this;

        if(!details){//为空时初始化数据
            details={};
        }

        windowBanEvent.bundling();//页面禁止事件

        _this.loadingRemove();//先删除页面上loading元素

        var thisText = details.text || 'LOADING..';//显示文字

        var thisNode=details.thisNode||0;//传入动画html

        var otherClass=details.thisClass|| false;//loading添加特殊class,成功失败不需要添加为false

        var thisInnerHtml=thisNode;

        var thisBg = _this.addLoadingBg('tip_loading_bg');

        /*在背景上加禁止浏览器默认事件*/
        document.getElementById('tip_loading_bg').addEventListener('touchmove',windowBanEvent.Canceling);

        var thisAddELe=_this.addNode('div',thisInnerHtml,'tip_loading',otherClass);//增加节点

        document.getElementsByClassName('showtext')[0].innerHTML=_this.changeString(thisText);

        document.activeElement.blur();//页面控件失焦

        thisAddELe.focus();//loading元素获得焦点

    },

    addLoadingBg:function (thisId) {

        var _this=this;

        _this.removeBg();

        return _this.addNode('div','',thisId,'tip_loading_bg');//增加节点

    },

    //loading删除方法
    //陈羽翔
    //2017.2.3
    loadingRemove:function () {//卸载loading

        var _this=this;

        if (document.getElementById('tip_loading')) {//删除之前，先判断当前元素是否存在

            windowBanEvent.unbundling();//解绑页面禁止事件

            _this.remove(document.getElementById('tip_loading'));//删除该元素


        }
            _this.removeBg('tip_loading_bg');


    },
    //新建元素的方法
    addNode: function (tag, innerHtml, id, className) {

        var obj = document.createElement(tag);

        if (id) {

            obj.id = id;

        }

        if(className){

            obj.className=className

        }

        obj.innerHTML = innerHtml;

        document.body.appendChild(obj);

        return obj;


    },

    dialogShow:function (details) {

        if(!details){//如果details未输入，则防止报错
            details={};
        }

        var mainText = details.mainText || 'null';

        var minText = details.minText || null;

        var hasCheck = details.noCheck|| false;

        var hasCancel = details.noCancel || false;

        var checkFn = details.checkFn || null;

        var checkBtnText=details.checkBtnText ||'确认';

        var cancleBtnText=details.cancleBtnText ||'取消';

        var thisUrl=details.thisUrl||'javascript:';

        var _this=this;

        var thisBg=_this.addBg('dialog_bg');

        var thisInnerHtml='<div class="text_dialog_container"><div class="text_big">'+mainText+'</div>';

        if(minText){

            thisInnerHtml+='<div class="text_small">'+minText+'</div>'

        }

        thisInnerHtml+='<div class="dialog_button">';

        if(!hasCheck){

            thisInnerHtml+='<a class="dialog_check red" href='+thisUrl+'>'+checkBtnText+'</a>'

        }

        if(!hasCancel){

            thisInnerHtml+='<a class="dialog_cancel gray" href="javascript:">'+cancleBtnText+'</a>'

        }

        thisInnerHtml+='</div></div>';

        var thisAddDialog = _this.addNode('div', thisInnerHtml, 'tip_dialog');//添加元素

        if(thisAddDialog.getElementsByClassName('dialog_cancel')[0]) {

            thisAddDialog.getElementsByClassName('dialog_cancel')[0].addEventListener('click', _this.dialogRemove.bind(_this), false);

        }

        thisBg.addEventListener('click',_this.dialogRemove.bind(_this),false);

        thisBg.addEventListener('touchmove',windowBanEvent.Canceling,false);

        if(checkFn) {

            thisAddDialog.getElementsByClassName('dialog_check')[0].addEventListener('click',checkFn,false);

        }


    },

    dialogRemove:function () {

        var _this=this;

        var thisDialogEle= document.getElementById('tip_dialog');

            _this.remove(thisDialogEle);//删除该元素


        var thisBgEle=document.getElementById('dialog_bg');

            _this.removeBg('dialog_bg');//删除背景

    },

    //增加背景
    //陈羽翔
    //2017.2.4
    addBg:function (thisId) {

        var _this=this;

        _this.removeBg();

        return _this.addNode('div','',thisId,'tip_bg');//增加节点

    },

    removeBg:function (thisId) {

        if(document.getElementById(thisId)){

            document.getElementById(thisId).click();

            this.remove(document.getElementById(thisId));

        }

    },

    //自动删除的方法
    remove: function (_element) {

        var _parentElement = _element.parentNode;//找到父元素，然后删除

        if (_parentElement) {

            _parentElement.removeChild(_element);

        }

    },

    //批量增加平滑过渡后监听方法
    transitionEndFn:function (thisEle,myFn) {

        thisEle.addEventListener("webkitTransitionEnd", myFn);

        thisEle.addEventListener("transitionend", myFn);

    },

    settimeoutFn:function(myFn){

        setTimeout(myFn,500);

    },

    //转义字符串
    changeString:function(node){

        var _this=this;

        var thisInsertHtml=node.toString().replace(/&/g,'&amp;').replace(/>/g,'&gt;').replace(/</g,'&lt;').replace(/"/g,'&quot;');

        return thisInsertHtml
    }

};


