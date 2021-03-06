define([
    'jquery', './base/Observer',
    './view/View', './view/HTMLView', './view/ListView', './view/DOMkit',
    './InnerLink'
],  function ($, Observer, View, HTMLView, ListView, DOMkit, InnerLink) {

    function WebApp(Page_Box, API_Root) {

        if (this instanceof $)
            return  new WebApp(this[0], Page_Box, API_Root);

        var _This_ = WebApp.instanceOf( $('*:webapp') )  ||  this;

        if (_This_ !== this)  return _This_;

        Observer.call(this, Page_Box).apiRoot = new URL(
            API_Root || '',  self.location.href
        );

        var path = self.location.href.split('?')[0];

        this.pageRoot = new URL(
            path  +  (path.match( /\/([^\/]+?\.html?)?$/i )  ?  ''  :  '/')
        );

        this.length = 0;
        this.lastPage = -1;
        this.loading = { };

        self.setTimeout( this.listenDOM().listenBOM().boot.bind( this ) );
    }

    return  Observer.extend(WebApp, {
        View:        View,
        HTMLView:    HTMLView,
        ListView:    ListView
    }, {
        splice:           Array.prototype.splice,
        switchTo:         function (Index) {

            if (this.lastPage == Index)  return;

            var iPage = View.instanceOf(this.$_View, false);

            if ( iPage )  iPage.detach();

            if (this.lastPage > -1)  this[ this.lastPage ].view = iPage;

            iPage = (this[ Index ]  ||  '').view;

            return  iPage && iPage.attach();
        },
        setRoute:         function (iLink) {

            this.switchTo();

            if (this[ this.lastPage ]  !=  (iLink + '')) {

                if (++this.lastPage != this.length)
                    this.splice(this.lastPage, Infinity);

                self.history.pushState(
                    {index: this.length},
                    document.title = iLink.title,
                    '#!'  +  self.btoa( iLink )
                );
                this[ this.length++ ] = iLink;
            }

            return this;
        },
        getRoute:         function () {
            return self.atob(
                (self.location.hash.match(/^\#!(.+)/) || '')[1]  ||  ''
            );
        },
        _emit:            function (iType, iLink, iData) {

            var $_Target = ((iLink.target === 'page')  ?  this  :  iLink).$_View;

            var observer = (iType in iLink.__handle__)  ?
                    iLink  :  View.instanceOf($_Target, false);

            iLink = $.extend(iLink.valueOf(), {
                type:      iType,
                target:    $_Target[0]
            });

            iData = this.emit(iLink, iData)  ||  iData;

            return  observer  ?  (observer.emit(iLink, iData)  ||  iData)  :  iData;
        },
        getCID:           function () {

            return  arguments[0].replace(this.pageRoot, '')
                .replace(/\.\w+(\?.*)?$/, '.html').split('#')[0];
        },
        loadView:         function (iLink, iHTML) {

            var iTarget = (
                    (iLink.target === 'page')  ?  this.setRoute( iLink )  :  iLink
                ).$_View[0];

            if (iHTML = this._emit('template', iLink, iHTML))
                DOMkit.build(iTarget, iLink, iHTML);

            var iView = View.getSub( iTarget );

            if ( iView.parse )  iView.parse();

            if (! $('script[src]:not(head > *)', iTarget)[0])
                iLink.emit('load');

            return iView;
        },
        loadComponent:    function (iLink, iHTML, iData) {

            var CID = this.getCID(new URL(iLink.href, this.pageRoot)  +  '');

            this.loading[ CID ] = iLink;

            var JS_Load = iLink.one('load');

            var iView = this.loadView(iLink, iHTML),  _This_ = this;

            return  JS_Load.then(function (iFactory) {

                delete _This_.loading[ CID ];

                iData = $.extend(
                    iData,  iLink.data,  iLink.$_View[0].dataset,  iData
                );

                iView.render(
                    iFactory  ?  (iFactory.call(iView, iData)  ||  iData)  :  iData
                );
            }).then(function () {

                return Promise.all($.map(
                    iView.childOf(),  _This_.load.bind(_This_)
                ));
            }).then(function () {  return iView;  });
        },
        load:             function (iLink) {

            if (! (iLink instanceof InnerLink))
                iLink = new InnerLink(
                    (iLink instanceof Observer)  ?  iLink.$_View[0]  :  iLink
                );

            var _This_ = this;

            return  iLink.load(function () {

                if ((this.dataType || '').slice(0, 4)  ===  'json')
                    this.url = (new URL(this.url, _This_.apiRoot))  +  '';

                _This_.emit($.extend(iLink.valueOf(), {type: 'request'}),  {
                    option:       this,
                    transport:    arguments[0]
                });

                this.crossDomain = $.isCrossDomain( this.url );

            }).then(function () {

                var iData = arguments[0][1];

                if (iData != null)  iData = _This_._emit('data', iLink, iData);

                if (iLink.target !== 'data')
                    return  _This_.loadComponent(iLink, arguments[0][0], iData);

            }).then(function (iView) {

                if (iView instanceof View)  _This_._emit('ready', iLink, iView);
            });
        },
        listenDOM:        function () {
            var _This_ = this;

            $('html').on('input change',  ':field',  $.throttle(function () {

                var iView = HTMLView.instanceOf( this );

                if ( iView )  iView.render( this );

            })).on('reset',  'form',  function () {

                var data = $.paramJSON('?'  +  $( this ).serialize());

                for (var key in data)  data[ key ] = '';

                HTMLView.instanceOf( this ).render( data );

            }).on('click submit',  InnerLink.HTML_Link,  function (iEvent) {
                if (
                    ((this.tagName !== 'FORM')  ||  (iEvent.type === 'submit'))  &&
                    ((this.target || '_self')  ===  '_self')  &&
                    _This_.getCID(this.href || this.action)
                ) {
                    iEvent.preventDefault();

                    _This_.load( this );
                }
            });

            return this;
        },
        listenBOM:        function () {

            var _This_ = this;

            $( self ).on('popstate',  function () {

                var state = this.history.state || '';

                if (! _This_[ state.index ])  return;

                if (_This_.lastPage !== state.index)
                    Promise.resolve(
                        _This_.switchTo( state.index )  ||
                        _This_.load( _This_[ state.index ] )
                    ).then(function () {

                        _This_.lastPage = state.index;

                        document.title = _This_[ state.index ].title;
                    });
                else if ( state.data )
                    View.instanceOf(_This_.$_View, false).render( state.data );
            });

            return this;
        },
        boot:             function () {
            var _This_ = this;

            return Promise.all($.map(
                $('[data-href]:not([data-href] *)').not(
                    this.$_View.find('[data-href]')
                ),
                function () {
                    return  _This_.load( arguments[0] );
                }
            )).then(function () {

                var Init = _This_.getRoute();

                if ( Init )
                    return  _This_.load( $('<a />',  {href: Init})[0] );

                $('a[href][data-autofocus="true"]').eq(0).click();
            });
        }
    });
});