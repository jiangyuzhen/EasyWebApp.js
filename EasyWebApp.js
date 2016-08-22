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

        this.$_View = iLink.getTarget();
        this.$_View = this.$_View[0] ? this.$_View : iLink.$_DOM;
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

            if (this.$_Content) {
                this.$_View.append( this.$_Content );
                this.ownerApp.trigger('attach');
            } else if (this.lastLoad)
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
        prefetch:      function () {
            var InnerLink = this.source.constructor;

            var $_Link = this.$_View.find( InnerLink.selector );

            for (var i = 0;  $_Link[i];  i++)
                (new InnerLink(this.ownerApp, $_Link[i])).prefetch();

            return this;
        },
        loadModule:    function (SyncBack) {
            var InnerLink = this.source.constructor;

            var $_Module = this.$_View
                    .find('*[href]:not(a, link), *[src]:not(img, iframe, script)')
                    .not(InnerLink.selector + ', *[href]:parent'),
                iReady,
                iArgs = $.makeArray(arguments).slice(1);

            //  About this --- https://github.com/jquery/jquery/issues/3270

            if (typeof SyncBack == 'function') {
                $_Module = $_Module.filter(function () {
                    return  (this.getAttribute('async') == 'false');
                });
                iReady = $_Module.length;
            }

            function Module_Ready() {
                if (! --iReady)  SyncBack.apply(this, iArgs);
            }

            for (var i = 0;  $_Module[i];  i++)
                (new UI_Module(
                    new InnerLink(this.ownerApp, $_Module[i])
                )).load(SyncBack && Module_Ready);

            if ((! i)  &&  (typeof SyncBack == 'function'))
                SyncBack.apply(this, iArgs);

            return this;
        },
        loadJSON:      function (JSON_Ready) {
            this.source.loadData(
                UI_Module.prototype.getData.call(this) ||
                    UI_Module.instanceOf('body').data,
                $.proxy(JSON_Ready, this)
            );
        },
        loadHTML:      function (HTML_Ready) {
            var iTemplate = this.constructor.$_Template,
                iHTML = this.source.href.split('?')[0],
                _This_ = this;

            function Load_Back() {
                _This_.ownerApp.trigger('attach');

                var iLink = _This_.prefetch().source;

                var $_Target = iLink.getTarget();

                var $_Link = $_Target.children('link[target="_blank"]')
                        .attr('href', iLink.href);

                var _Link_ = $_Link[0] && (
                        new iLink.constructor(iLink.ownerApp, $_Link[0])
                    ).register(iLink.ownerApp.length - 1);

                if (
                    ((! iLink.href)  ||  iLink.src  ||  iLink.action)  ||
                    ($_Target[0] != _This_.ownerApp.$_Root[0])  ||
                    (! _Link_)
                )
                    return _This_.loadModule(HTML_Ready);

                iLink.method = _Link_.method || iLink.method;
                iLink.src = _Link_.src;
                iLink.data = _Link_.data;

                $.extend(_This_.data, _This_.getEnv());

                _This_.loadJSON($.proxy(_This_.loadModule, null, HTML_Ready));
            }

            if (iTemplate[iHTML]) {
                this.$_View.append( iTemplate[iHTML].clone(true) );

                return Load_Back();
            }

            this.$_View.load(iHTML,  function () {
                iTemplate[iHTML] = $(this.children).not('script').clone(true);

                Load_Back();
            });
        },
        render:        function (iData) {
            if (! $.isEmptyObject(iData)) {
                $.extend(this.data, iData);

                if ($.likeArray( iData )) {
                    this.data.length = iData.length;

                    Array.prototype.splice.call(
                        this.data,  iData.length,  iData.length
                    );
                }
            }
            if (! $.isEmptyObject(this.data))
                this.$_View.dataRender(this.data);

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
            var _This_ = this,  iJSON = this.source.src || this.source.action;

            var iReady = (this.source.href && iJSON)  ?  2  :  1,  iData;

            function Load_Back(_JSON_) {
                if ($.isPlainObject(_JSON_))
                    iData = _This_.trigger('data', [_JSON_])  ||  _JSON_;

                if (--iReady)  return;

                _This_.render(iData).loadModule();

                _This_.lastLoad = $.now();

                if (typeof iCallback == 'function')
                    iCallback.call(_This_);

                _This_.trigger('ready');
            }

            if (this.source.href)  this.loadHTML(Load_Back);

            if (iJSON)  this.loadJSON(Load_Back);

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

        this.data = iLink.dataset;
    }

    $.extend(InnerLink, {
        selector:       [
            '*[target]:not(a)',
            'a[target="_self"]',
            'a[target="_blank"][rel="nofollow"]'
        ].join(', '),
        reURLVar:       /\{(.+?)\}/g,
        prefetchRel:    $.browser.modern ? 'prefetch' : 'next'
    });

    var $_Prefetch = $('<link rel="' + InnerLink.prefetchRel + '" />')
            .on('load',  function () {
                $(this).remove();
            });

    $.extend(InnerLink.prototype, {
        valueOf:      function () {
            var iValue = { };

            for (var iKey in this)
                if (typeof this[iKey] != 'function')
                    iValue[iKey] = this[iKey];

            return iValue;
        },
        getTarget:    function () {
            switch (this.target) {
                case '_self':      return this.ownerApp.$_Root;
                case '_blank':     ;
                case '_parent':    ;
                case '_top':       return $();
            }

            return  this.target  ?  $('*[name="' + this.target + '"]')  :  $();
        },
        getArgs:      function () {
            var iArgs = { },  iData = this.ownerView.getData();

            (this.src || this.action || '').replace(
                InnerLink.reURLVar,
                function () {
                    iArgs[ arguments[1] ] = iData[ arguments[1] ];
                }
            );
            for (var iKey in this.data)
                iArgs[ this.data[iKey] ] = iData[ this.data[iKey] ];

            return iArgs;
        },
        getURL:       function (iName, iScope) {
            var iURL = this[iName] =
                    this.$_DOM[0].getAttribute(iName) || this[iName];

            iScope = iScope  ||  (this.ownerView || '').data;

            if (! iURL)  return;

            if (! $.isEmptyObject(iScope)) {
                var _Args_ = { },  _Data_;

                for (var iKey in this.data) {
                    _Data_ = iScope[ this.data[iKey] ];

                    if ($.isData(_Data_))  _Args_[iKey] = _Data_;
                }

                iURL = $.extendURL(
                    iURL.replace(InnerLink.reURLVar,  function () {
                        return  iScope[arguments[1]] || '';
                    }),
                    _Args_
                );
            }

            if ((iName != 'href')  &&  (! $.urlDomain(iURL || ' ')))
                iURL = this.ownerApp.apiPath + iURL;

            return iURL;
        },
        register:     function (Index) {
            DOM.title = this.title || DOM.title;

            BOM.history[
                (this.$_DOM[0].tagName != 'LINK')  ?
                    'pushState'  :  'replaceState'
            ](
                {index: Index},
                DOM.title,
                '#!'  +  $.extendURL(this.href, this.getArgs())
            );

            return this;
        },
        loadData:     function (iScope, Data_Ready) {
            $[this.method](
                this.getURL('src', iScope)  ||  this.getURL('action', iScope),
                this.$_DOM.serialize(),
                $.proxy(Data_Ready, this)
            );
        },
        prefetch:     function () {
            var iHTML = (this.href || '').split('?')[0],
                iJSON = this.src || this.action || '';

            if (iHTML)
                $_Prefetch.clone(true).attr('href', iHTML).appendTo('head');

            if (
                (this.method == 'get')  &&
                (! iJSON.match(this.constructor.reURLVar))  &&
                $.isEmptyObject( this.data )
            )
                $_Prefetch.clone(true).attr(
                    'href',  this.getURL('src') || this.getURL('action')
                ).appendTo('head');
        }
    });

    return InnerLink;

})(self, self.document, self.jQuery, UI_Module);



var WebApp = (function (BOM, DOM, $, UI_Module, InnerLink) {

    var $_BOM = $(BOM);

    function WebApp(Page_Box, API_Path, Cache_Minute) {
        var _Self_ = arguments.callee;

        if (this instanceof $)
            return  new _Self_(this[0], Page_Box, API_Path);

        var _This_ = $('*:data("_EWA_")').data('_EWA_') || this;

        if (_This_ !== this)  return _This_;

        $.Observer.call(this, 1);

        this.$_Root = $(Page_Box).data('_EWA_', this);

        var iArgs = $.makeArray(arguments).slice(1);

        this.apiPath = $.urlDomain(iArgs[0] || ' ')  ?  iArgs.shift()  :  '';
        this.cacheMinute = $.isNumeric( iArgs[0] )  ?  iArgs.shift()  :  3;

        this.length = 0;
        this.lastPage = -1;

        $_BOM.on('popstate',  function () {

            var Index = (arguments[0].originalEvent.state || '').index;

            _This_.hashChange = false;

            if ((! _This_[Index])  ||  (_This_.lastPage == Index))
                return;

            _This_[_This_.lastPage].detach();
            _This_[_This_.lastPage = Index].attach();

        }).on('hashchange',  function () {

            if (_This_.hashChange === false)
                return  _This_.hashChange = null;

            var iHash = _Self_.getRoute();

            if (iHash)  _This_.load(iHash);
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
            $('<span />',  $.extend(
                {style: 'display: none'},
                (typeof HTML_URL == 'object')  ?  HTML_URL  :  {
                    target:    '_self',
                    href:      HTML_URL
                }
            )).appendTo('body').click();

            return this;
        },
        init:            function () {
            var iModule = new UI_Module(new InnerLink(this, DOM.body));

            var iLink = iModule.source,  _This_ = this;

            $.extend(iModule.data, $.paramJSON());

            if (iLink.href || iLink.src || iLink.action)
                iModule.load(First_Page);
            else
                First_Page.call( iModule.render().loadModule() );
        },
        register:        function (iPage) {
            if (this.$_Root[0] !== iPage.$_View[0])  return;

            if (this.lastPage > -1)  this[this.lastPage].detach();

            if (++this.lastPage != this.length)
                this.splice(this.lastPage, this.length);

            this.hashChange = false;
            iPage.source.register( this.length );
            this.push( iPage );

            var iTimeOut = $.now()  -  (1000 * 60 * this.cacheMinute);

            for (var i = 0;  (i + 2) < this.length;  i++)
                if ((this[i].lastLoad < iTimeOut)  &&  this[i].$_Content) {
                    this[i].$_Content.remove();
                    this[i].$_Content = null;
                }
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
//      [Version]    v3.0  (2016-08-22)  Beta
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

        switch (this.tagName) {
            case 'FORM':    if (iEvent.type != 'submit')  return;
            case 'A':       iEvent.preventDefault();    break;
        }
        iEvent.stopPropagation();

        var iLink = new InnerLink(new WebApp(), this);

        switch (iLink.target) {
            case null:        ;
            case '':          return;
            case '_blank':
                UI_Module.prototype.loadJSON.call({source: iLink},  function () {
                    iLink.ownerApp.trigger(
                        'data',  '',  iLink.src || iLink.action,  [
                            iLink.valueOf(),  arguments[0]
                        ]
                    );
                });
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
