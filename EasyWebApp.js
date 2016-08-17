(function () {

    if ((typeof this.define != 'function')  ||  (! this.define.amd))
        arguments[0]();
    else
        this.define('EasyWebApp', ['iQuery+'], arguments[0]);

})(function () {


var DS_Inherit = (function (BOM, DOM, $) {

    function DataScope(iData) {
        if (! $.isEmptyObject(iData))  $.extend(this, iData);
    }

    var iPrototype = {
            constructor:    DataScope,
            toString:       function () {
                return  '[object DataScope]';
            },
            valueOf:        function () {
                if (this.hasOwnProperty('length'))  return $.makeArray(this);

                var iValue = { };

                for (var iKey in this)
                    if (
                        this.hasOwnProperty(iKey)  &&
                        (! iKey.match(/^(\d+|length)$/))
                    )
                        iValue[iKey] = this[iKey];

                return iValue;
            }
        };

    return  function (iSup, iSub) {
        DataScope.prototype = $.isEmptyObject(iSup) ? iPrototype : iSup;

        var iData = new DataScope(iSub);

        DataScope.prototype = null;

        return iData;
    };

})(self, self.document, self.jQuery);



var ViewDataIO = (function (BOM, DOM, $, DS_Inherit) {

    function ArrayRender(iArray, ValueRender) {

        $.ListView(this,  function ($_Item, iValue) {

            $_Item.data('EWA_DS',  DS_Inherit(iArray, iValue))
                .value('name', iValue);

            ValueRender.call($_Item, iValue);

        }).clear().render( iArray );
    }

    function ObjectRender(iData) {
        var _Self_ = arguments.callee;

        if ($.likeArray( iData ))
            return  ArrayRender.call(this[0], iData, _Self_);

        var iView = $.CommonView.instanceOf(this, false);

        if (iView)  return iView.render(iData);

        this.value('name',  function (iName) {

            if ($.likeArray( iData[iName] ))
                ArrayRender.call(this, iData[iName], _Self_);
            else if ($.isPlainObject( iData[iName] ))
                _Self_.call($(this), iData[iName]);
            else
                return iData[iName];
        });
    }

    $.fn.extend({
        dataRender:    function (iData) {
            if (! $.likeArray(iData)) {
                ObjectRender.call(this, iData);

                return this;
            }

            var iView = $.ListView.instanceOf(this, false);

            ArrayRender.call(
                iView  ?  iView.$_View[0]  :  $.ListView.findView(this, true)[0],
                iData,
                ObjectRender
            );

            return this;
        },
        dataReader:    function () {
            var $_Key = $('[name]', this[0]).not( $('[name] [name]', this[0]) ),
                iData = { };

            if (! $_Key[0])  return this.value();

            for (var i = 0, iName, iLV;  i < $_Key.length;  i++) {
                iName = $_Key[i].getAttribute('name');
                iLV = $.ListView.instanceOf($_Key[i], false);

                if (! iLV)
                    iData[iName] = arguments.callee.call( $( $_Key[i] ) );
                else {
                    iData[iName] = [ ];

                    for (var j = 0;  j < iLV.length;  j++)
                        iData[iName][j] = $.extend(
                            iLV.valueOf(j),  arguments.callee.call( iLV[j] )
                        );
                }
            }
            return iData;
        }
    });
})(self, self.document, self.jQuery, DS_Inherit);



var UI_Module = (function (BOM, DOM, $, DS_Inherit) {

    function UI_Module(iLink) {
        this.ownerApp = iLink.ownerApp;
        this.source = iLink;

        var iScope = iLink.ownerView && iLink.ownerView.getData();
        iScope = $.likeArray(iScope)  ?  { }  :  iScope;

        this.data = DS_Inherit(iScope || { },  this.getEnv());

        var $_View = iLink.target || iLink.$_DOM;

        if ($_View == '_self')
            $_View = this.ownerApp.$_Root;
        else if (typeof $_View == 'string')
            $_View = '*[name="' + $_View + '"]';

        this.$_View = $($_View);
        this.attach();

        this.lastLoad = 0;

        this.ownerApp.register(this);
    }

    $.extend(UI_Module, {
        getClass:      $.CommonView.getClass,
        instanceOf:    $.CommonView.instanceOf,
        $_Template:    { }
    });

    $.extend(UI_Module.prototype, {
        toString:      $.CommonView.prototype.toString,
        detach:        function () {
            this.$_Content = this.$_View.children().detach();

            return this;
        },
        attach:        function () {
            this.$_View.data(this.constructor.getClass(), this);

            if (this.$_Content)
                this.$_View.append( this.$_Content );
            else if (this.lastLoad)
                this.load();

            return this;
        },
        getData:       function () {
            var iLV = $.ListView.instanceOf( this.source.$_DOM );

            if ((! iLV)  ||  (iLV.$_View[0] === this.source.$_DOM[0]))
                return this.data;

            var $_Item = this.source.$_DOM.parentsUntil( iLV.$_View );

            return  ($_Item[0] ? $_Item.slice(-1) : this.source.$_DOM)
                .data('EWA_DS');
        },
        getEnv:        function () {
            var iData = { },
                iHTML = this.source.getURL('href'),
                iJSON = this.source.getURL('src') || this.source.getURL('action');

            if (iHTML) {
                var iFileName = $.fileName(iHTML).split('.');

                $.extend(iData, {
                    _File_Path_:    $.filePath(iHTML),
                    _File_Name_:    iFileName[0],
                    _File_Ext_:     iFileName[1]
                });
            }

            if (iJSON)
                $.extend(iData, {
                    _Data_Path_:    $.filePath(iJSON),
                    _Data_Name_:    $.fileName(iJSON)
                });

            return  $.extend(iData, $.paramJSON(this.source.href));
        },
        loadModule:    function (SyncBack) {
            var InnerLink = this.source.constructor;

            var $_Module = this.$_View
                    .find('*[href]:not(a, link), *[src]:not(img, iframe, script)')
                    .not(InnerLink.selector + ', *[href]:parent'),
                iReady;

            //  About this --- https://github.com/jquery/jquery/issues/3270

            if (typeof SyncBack == 'function') {
                $_Module = $_Module.filter(function () {
                    return  (this.getAttribute('async') == 'false');
                });
                iReady = $_Module.length;
            }

            function Module_Ready() {
                if (! --iReady)  SyncBack.call(this);
            }

            for (var i = 0;  $_Module[i];  i++)
                (new UI_Module(
                    new InnerLink(this.ownerApp, $_Module[i])
                )).load(SyncBack && Module_Ready);

            if ((! i)  &&  SyncBack)  SyncBack.call(this);

            return this;
        },
        loadHTML:      function (HTML_Ready) {
            var iTemplate = this.constructor.$_Template,
                iHTML = this.source.href.split('?')[0];

            HTML_Ready = $.proxy(this.loadModule, this, HTML_Ready);

            if (iTemplate[iHTML]) {
                this.$_View.append( iTemplate[iHTML].clone(true) );

                return HTML_Ready();
            }

            this.$_View.load(this.source.getURL('href', this.data),  function () {
                iTemplate[iHTML] = $(this.children).not('script').clone(true);

                HTML_Ready();
            });
        },
        render:        function (iData) {
            iData = iData || this.data;

            if (! $.isEmptyObject(iData))  this.$_View.dataRender(iData);

            return this;
        },
        trigger:       function () {
            return this.ownerApp.trigger(
                arguments[0],
                this.source.href || '',
                this.source.src || this.source.action || '',
                [ this.source.valueOf() ].concat( arguments[1] )
            ).slice(-1)[0];
        },
        load:          function (iCallback) {
            var iThis = this,  iJSON = this.source.src || this.source.action;

            var iReady = (this.source.href && iJSON)  ?  2  :  1;

            function Load_Back() {
                if (--iReady)  return;

                iThis.render().loadModule();

                iThis.lastLoad = $.now();

                if (typeof iCallback == 'function')
                    iCallback.call(iThis);

                iThis.trigger('ready');
            }

            if (this.source.href)  this.loadHTML(Load_Back);

            if (iJSON) {
                if (this.lastLoad)
                    Load_Back.call(this);
                else
                    this.source.loadData(this.getData(),  function (_JSON_) {
                        _JSON_ = iThis.trigger('data', [_JSON_])  ||  _JSON_;

                        $.extend(iThis.data, _JSON_);

                        if (_JSON_ instanceof Array)
                            iThis.data.length = _JSON_.length;

                        Load_Back.call(iThis);
                    });
            }
            return this;
        }
    });

    return UI_Module;

})(self, self.document, self.jQuery, DS_Inherit);



var InnerLink = (function (BOM, DOM, $, UI_Module) {

    function InnerLink(iApp, iLink) {
        this.ownerApp = iApp;
        this.ownerView = UI_Module.instanceOf(iLink);

        this.$_DOM = $(iLink);

        this.title = iLink.title;
        this.target = iLink.getAttribute('target');
        this.href = iLink.getAttribute('href');
        this.method = (iLink.getAttribute('method') || 'GET').toLowerCase();
        this.src = iLink.getAttribute('src');
        this.action = iLink.getAttribute('action');
    }

    InnerLink.selector = '*[target]:not(a)';

    $.extend(InnerLink.prototype, {
        valueOf:     function () {
            var iValue = { };

            for (var iKey in this)
                if (typeof this[iKey] != 'function')
                    iValue[iKey] = this[iKey];

            return iValue;
        },
        getURL:      function (iName, iScope) {
            var iURL = this[iName] = this.$_DOM[0].getAttribute(iName);

            iScope = iScope  ||  (this.ownerView || '').data;

            if ((! iURL)  ||  $.isEmptyObject(iScope))  return iURL;

            var iArgs = this.$_DOM[0].dataset,  _Args_ = { },  _Data_;

            for (var iKey in iArgs) {
                _Data_ = iScope[ iArgs[iKey] ];

                if ($.isData(_Data_))  _Args_[iKey] = _Data_;
            }

            return $.extendURL(
                iURL.replace(/\{(.+?)\}/g,  function () {
                    return  iScope[arguments[1]] || '';
                }),
                _Args_
            );
        },
        loadData:    function (iScope, Data_Ready) {
            $[this.method](
                this.ownerApp.apiPath + (
                    this.getURL('src', iScope)  ||  this.getURL('action', iScope)
                ),
                this.$_DOM.serialize(),
                $.proxy(Data_Ready, this)
            );
        }
    });

    return InnerLink;

})(self, self.document, self.jQuery, UI_Module);



var WebApp = (function (BOM, DOM, $, UI_Module, InnerLink) {

    var $_BOM = $(BOM);

    function WebApp(Page_Box, API_Path, Cache_Minute, showLocation) {
        var _Self_ = arguments.callee;

        if (this instanceof $)
            return  new _Self_(this[0], Page_Box, API_Path, Cache_Minute);

        var iApp = $('*:data("_EWA_")').data('_EWA_') || this;

        if (iApp !== this)  return iApp;

        $.Observer.call(this, 1);

        this.$_Root = $(Page_Box).data('_EWA_', this);

        var iArgs = $.makeArray(arguments).slice(1);

        this.apiPath = String( iArgs[0] ).match(/^(\w+:)?\/\//)  ?
            iArgs.shift()  :  '';
        this.cacheMinute = $.isNumeric( iArgs[0] )  ?  iArgs.shift()  :  3;
        this.needLocation = iArgs[0];

        this.length = 0;
        this.lastPage = -1;

        $_BOM.on('popstate',  function () {

            var Index = (arguments[0].originalEvent.state || '').index;

            if (typeof Index != 'number')
                return;
            else if (iApp.lastPage == Index)
                return  this.setTimeout(function () {
                    this.history.back();
                });

            iApp[iApp.lastPage].detach();
            iApp[iApp.lastPage = Index].attach();

        }).on('hashchange',  function () {

            if (iApp.hashChange === false)
                return  iApp.hashChange = null;

            var iHash = _Self_.getRoute();

            if (iHash  &&  (!  $('*[href="' + iHash + '"]').eq(0).click()[0]))
                iApp.load(iHash);
        });

        this.init();
    }

    WebApp.getRoute = function () {
        var iHash = BOM.location.hash.match(/^#!([^#!]+)/);
        return  iHash && iHash[1];
    };

    function First_Page() {
        var iHash = WebApp.getRoute();

        if (! iHash)
            $('body *[autofocus]:not(:input)').eq(0).click();
        else
            this.ownerApp.load(iHash);
    }

    WebApp.fn = WebApp.prototype = $.extend(new $.Observer(),  {
        constructor:     WebApp,
        push:            Array.prototype.push,
        splice:          Array.prototype.splice,
        load:            function (HTML_URL) {
            $('<span />', {
                style:     'display: none',
                target:    '_self',
                href:      HTML_URL
            }).appendTo('body').click();

            return this;
        },
        init:            function () {
            var iModule = new UI_Module(new InnerLink(this, DOM.body));

            var iLink = iModule.source,  iApp = this;

            $.extend(iModule.data, $.paramJSON());

            if (iLink.href || iLink.src || iLink.action)
                iModule.load(First_Page);
            else
                First_Page.call( iModule.render().loadModule() );

            if (! this.needLocation)  return;

            $_BOM.on('blur',  function () {

                iApp.showLocation();

            }).on('focus',  function () {

                this.history.replaceState(
                    {index:  iApp.lastPage},
                    iApp[iApp.lastPage].source.title || DOM.title,
                    this.location.href.split(/\?|#/)[0]
                );

                this.location.hash = '';
            });
        },
        register:        function (iPage) {
            if (this.$_Root[0] !== iPage.$_View[0])  return;

            if (this.lastPage > -1)  this[this.lastPage].detach();

            if (++this.lastPage != this.length)
                this.splice(this.lastPage, this.length);

            BOM.history.pushState(
                {index: this.length},  iPage.source.title || DOM.title,  DOM.URL
            );
            this.push( iPage );

            var iTimeOut = $.now()  -  (1000 * 60 * this.cacheMinute);

            for (var i = 0;  (i + 2) < this.length;  i++)
                if ((this[i].lastLoad < iTimeOut)  &&  this[i].$_Content) {
                    this[i].$_Content.remove();
                    this[i].$_Content = null;
                }
        },
        showLocation:    function () {
            var iPage = this[this.lastPage];

            var iLink = iPage.source,  iArgs = { };

            (iLink.src || iLink.action).replace(/\{(.+?)\}/g,  function () {
                iArgs[ arguments[1] ] = iPage.data[ arguments[1] ];
            });

            if (! $.isEmptyObject(iArgs))
                BOM.history.replaceState(
                    {index: this.lastPage},
                    iLink.title || DOM.title,
                    $.extendURL(DOM.URL, iArgs)
                );

            this.hashChange = false;
            BOM.location.hash = '!' + iLink.href;

            return BOM.location.href;
        },
        getModule:       function () {
            return  UI_Module.instanceOf( arguments[0] );
        }
    });

    return  $.fn.iWebApp = WebApp;

})(self, self.document, self.jQuery, UI_Module, InnerLink);


//
//                    >>>  EasyWebApp.js  <<<
//
//
//      [Version]    v3.0  (2016-08-17)  Alpha
//
//      [Require]    iQuery  ||  jQuery with jQuery+,
//
//                   iQuery+,
//
//                   [ marked.js ]  (for MarkDown rendering)
//
//      [Usage]      A Light-weight SPA Engine with
//                   jQuery Compatible API.
//
//
//              (C)2015-2016    shiy2008@gmail.com
//



var EasyWebApp = (function (BOM, DOM, $, WebApp, InnerLink, UI_Module) {

    $.ajaxSetup({dataType: 'json'});

    $(document).on('click submit',  InnerLink.selector,  function (iEvent) {

        if (this.tagName == 'FORM') {
            if (iEvent.type != 'submit')
                return;
            else
                iEvent.preventDefault();
        } else if (
            (this !== iEvent.target)  &&
            $(iEvent.target).parentsUntil(this).addBack().filter('a')[0]
        )
            return;

        iEvent.stopPropagation();

        var iLink = new InnerLink(new WebApp(), this);

        switch (iLink.target) {
            case null:        ;
            case '':          return;
            case '_blank':
                iLink.loadData(
                    UI_Module.prototype.getData.call({source: iLink}),
                    function () {
                        this.ownerApp.trigger(
                            'data',  '',  this.src || this.action,  [
                                this.valueOf(),  arguments[0]
                            ]
                        );
                    }
                );
                break;
            case '_self':     ;
            default:          (new UI_Module(iLink)).load();
        }
    }).change(function () {

        var $_VS = $( arguments[0].target );

        UI_Module.instanceOf( $_VS )
            .data[ $_VS[0].getAttribute('name') ] = $_VS.val();
    });
})(self, self.document, self.jQuery, WebApp, InnerLink, UI_Module);


});
