define(['jquery', 'UI_Module', 'InnerLink'],  function ($, UI_Module, InnerLink) {

    var BOM = self,  DOM = self.document;

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

        $(BOM).on('popstate',  function () {

            var Index = (arguments[0].originalEvent.state || '').index;

            if (! _This_[Index])  return;

            _This_.hashChange = false;

            if (_This_.lastPage == Index)  return;

            var iPage = _This_[Index];

            _This_[_This_.lastPage].detach().then(
                $.proxy(iPage.attach, iPage)
            ).then(function () {

                _This_.lastPage = Index

                if ((! iPage.$_View.children()[0])  &&  iPage.lastLoad)
                    return  _This_.bootLink( iPage.source );

                DOM.title = iPage.source.title || DOM.title;
            });
        }).on('hashchange',  function () {

            if (_This_.hashChange !== false)  _This_.loadLink();

            _This_.hashChange = null;
        });

        this.init();
    }

    $.fn.iWebApp = $.inherit($.Observer, WebApp, null, {
        push:        Array.prototype.push,
        splice:      Array.prototype.splice,
        loadLink:    function () {
            var iURL = (arguments[0] || BOM.location).hash.match(/^#!([^#!]+)/);

            return  iURL  &&  this.load( iURL[1] );
        },
        load:        function (HTML_URL, $_Sibling) {
            $('<span />',  $.extend(
                {style: 'display: none'},
                (typeof HTML_URL == 'object')  ?  HTML_URL  :  {
                    target:    '_self',
                    href:      HTML_URL
                }
            )).appendTo($_Sibling || 'body').click();

            return this;
        },
        register:    function (iPage) {

            if (++this.lastPage != this.length)
                $.each(this.splice(this.lastPage, Infinity),  iPage.destructor);

            iPage.source.register( this.length );
            this.push( iPage );

            var iTimeOut = $.now()  -  (1000 * 60 * this.cacheMinute);

            for (var i = 0;  this[i + 2];  i++)
                if (this[i].lastLoad < iTimeOut)  this[i].destructor();

            return iPage;
        },
        bootLink:    function (iLink, iPrev) {
            var _This_ = this,
                not_Page = (this.$_Root[0] !== (
                    (iPrev || '').$_View  ||  iLink.getTarget()
                )[0]);

            return  iLink.load().then(function () {

                var iHTML = arguments[0][0],  iJSON = arguments[0][1];

                if ( not_Page )
                    return  (new UI_Module( iLink )).load(iJSON, iHTML);

                var iScope = iLink.getScope(),  iNext;

                return  (iPrev ? iPrev.detach() : Promise.resolve(''))
                    .then(function () {

                        iNext = new UI_Module(iLink, iScope);

                        return  iNext.load(iJSON, iHTML);

                    }).then(function () {

                        if (! iNext.registered)  _This_.register( iNext );

                    },  function () {

                        return iNext.destructor().then(
                            iPrev  ?  $.proxy(iPrev.attach, iPrev)  :  $.noop
                        );
                    });
            });
        },
        init:        function () {
            var iModule = new UI_Module(new InnerLink(this, DOM.body));

            iModule.template.scope.extend( $.paramJSON() );

            this.bootLink( iModule.source ).then(function () {

                if (! iModule.ownerApp.loadLink()) {
                    var iAuto = $('body *[autofocus]:not(:input)')[0];

                    if ( iAuto )  iAuto.click();
                }
            });
        },
        boot:        function (iLink) {
            iLink = new InnerLink(this, iLink);

            var _This_ = this;

            switch (iLink.target) {
                case null:        ;
                case '':          break;
                case '_blank':
                    iLink.loadJSON().then(function () {
                        _This_.trigger(
                            'data',
                            iLink.href || '',
                            iLink.src || iLink.action || '',
                            [iLink, arguments[0]]
                        );
                    });
                    break;
                case '_self':     ;
                default:          {
                    var iModule = UI_Module.instanceOf(iLink.getTarget(), false);

                    if (! (iModule || '').domReady)
                        this.bootLink(iLink, iModule).catch(function () {

                            console.error( arguments[0] );
                        });
                }
            }

            return this;
        }
    });

    WebApp.fn = WebApp.prototype;

    return WebApp;

});
