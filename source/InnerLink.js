define(['jquery', './base/Observer', 'jQueryKit'],  function ($, Observer) {

    function InnerLink($_View) {

        var _This_ = Observer.call(this, $_View);

        return  ((_This_ !== this)  ?  _This_  :  this).setProp();
    }

    return  Observer.extend(InnerLink, {
        parsePath:    function (iPath) {

            var iNew;  iPath = iPath.replace(/^\.\//, '').replace(/\/\.\//g, '/');

            do {
                iPath = iNew || iPath;

                iNew = iPath.replace(/[^\.\/]+\/\.\.\//g, '');

            } while (iNew  &&  (iNew !== iPath));

            return iNew;
        },
        HTML_Link:    'a[href], area[href], form[action]',
        Self_Link:    '[data-href]:not(a, form)'
    }, {
        setProp:     function () {

            var link = this.$_View[0];

            this.method = (
                link.getAttribute('method') || link.dataset.method || 'Get'
            ).toUpperCase();

            this.contentType =
                link.getAttribute('type') || link.getAttribute('enctype') ||
                'application/x-www-form-urlencoded';

            this.charset = (
                link.getAttribute('charset') || link.acceptCharset ||
                document.charset
            ).split(/\s+/);

            this.setURI().title = link.title || document.title;

            if (! /^(a|area|form)$/i.test( link.tagName ))
                this.target = 'view';
            else if ( this.href )
                this.target = 'page';
            else
                this.target = 'data';

            return this;
        },
        setURI:      function () {

            var link = this.$_View[0];

            this.href = link.dataset.href ||
                link.getAttribute(link.href ? 'href' : 'action');

            this.src = this.href.split(/\?data=|&data=/);

            this.href = this.src[0];

            this.src = this.src[1];

            this.data = $.paramJSON( this.href );

            this.href = InnerLink.parsePath( this.href.split('?')[0] );

            return this;
        },
        toString:    function () {

            var iData = [$.param( this.data )];

            if (! iData[0])  iData.length = 0;

            if ( this.src )  iData.push('data=' + this.src);

            iData = iData.join('&');

            return  (this.href || '')  +  (iData  &&  ('?' + iData));
        },
        loadData:    function () {

            var URI = this.method + ' ';

            var iOption = {
                    type:           this.method,
                    beforeSend:     arguments[0],
                    contentType:
                        this.contentType  +  '; charset='  +  this.charset[0],
                    dataType:
                        (this.src.match(/\?/g) || '')[1]  ?  'jsonp'  :  'json',
                    complete:       function () {
                        URI += this.url;
                    }
                };

            if ( this.$_View[0].tagName.match(/^(a|area)$/i) ) {

                iOption.data = $.extend({ }, this.$_View[0].dataset);

                delete iOption.data.method;
                delete iOption.data.autofocus;

            } else if (! this.$_View.find('input[type="file"]')[0]) {

                iOption.data = $.paramJSON('?' + this.$_View.serialize());

            } else if (iOption.type != 'GET') {

                iOption.data = new self.FormData( this.$_View[0] );

                iOption.contentType = iOption.processData = false;
            }

            if ( this.contentType.match(/^application\/json/) ) {

                iOption.data = JSON.stringify( iOption.data );

                iOption.processData = false;
            }

            var iJSON = Promise.resolve( $.ajax(this.src, iOption) );

            return  (this.method != 'GET')  ?  iJSON  :  iJSON.then(
                function () {
                    return  $.storage(URI, arguments[0]);
                },
                function () {
                    return  $.storage( URI );
                }
            );
        },
        load:        function (onRequest) {

            return Promise.all([
                this.href  &&  $.ajax({
                    type:          'GET',
                    url:           this.href,
                    beforeSend:    onRequest
                }),
                this.src  &&  this.loadData( onRequest )
            ]);
        },
        valueOf:     function () {
            var _This_ = { };

            for (var iKey in this)
                if (
                    (typeof this[iKey] != 'object')  &&
                    (typeof this[iKey] != 'function')
                )
                    _This_[iKey] = this[iKey];

            _This_.target = this.$_View[0];

            return _This_;
        }
    }).registerEvent('data');

});