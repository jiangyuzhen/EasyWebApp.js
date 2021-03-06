require(['jquery', 'TimePassed', 'EasyWebApp'],  function ($, TimePassed) {

    function Object_Filter(iValue) {
        iValue.title = iValue.title || iValue.name;

        if ((iValue.name || '').match(/^\S+?（.）/))  return;

        iValue.img = iValue.img || iValue.src;

        if (iValue.img) {
            if (iValue.img.indexOf('default.jpg') > -1)  return;

            if (! iValue.img.match(/^http(s)?:\/\//))
                iValue.img = 'http://tnfs.tngou.net/img' + iValue.img;
        }
        iValue.timePassed = iValue.time ?
            TimePassed(iValue.time) : iValue.keywords;

        iValue.list = $.map(iValue.list, arguments.callee);

        return iValue;
    }

    $(document).ready(function () {

        var iApp = $('body > .PC_Narrow').iWebApp('http://www.tngou.net/api/');

        iApp.on({
            type:    'request',
            src:     /\.json$/
        },  function (_, iAJAX) {

            iAJAX.option.url = iAJAX.option.url.replace(iApp.apiRoot, '');

        }).on('data',  function (iEvent, iData) {

            if (iData.status === false)
                return  self.alert("【服务器报错】" + iData.msg);

            if (! iData.tngou)  return  Object_Filter( iData );

            iData = $.map(iData.tngou, Object_Filter);

            return  iEvent.href  ?  {list: iData}  :  iData;
        }).on({
            type:    'ready',
            src:     'index.json'
        },  function () {

            $('li > a', arguments[0].target)[0].click();
        });
    }).on('ajaxStart',  function () {

        $( this.body ).removeClass('Loaded');

    }).on('ajaxStop',  function () {

        $( this.body ).addClass('Loaded');
    });
});