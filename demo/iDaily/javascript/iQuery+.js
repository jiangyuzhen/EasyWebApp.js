//
//              >>>  iQuery+  <<<
//
//
//    [Version]     v0.7  (2015-12-28)  Stable
//
//    [Based on]    jQuery  v1.9+
//
//
//          (C)2015  shiy2008@gmail.com
//


(function (BOM, DOM, $) {

/* ---------- ListView Interface  v0.5 ---------- */

//  Thanks "EasyWebApp" Project --- http://git.oschina.net/Tech_Query/EasyWebApp

    function ListView($_View, $_Item, onInsert) {
        var _Self_ = arguments.callee;

        if (!  (this instanceof _Self_))
            return  new _Self_($_View, $_Item, onInsert);

        $_View = $($_View);
        if (typeof $_Item == 'function') {
            onInsert = $_Item;
            $_Item = [undefined];
        }

        iView = $_View.data('_LVI_');
        iView = (iView instanceof _Self_)  ?  iView  :  this;

        this.callback = {
            insert:         [ ],
            remove:         [ ],
            afterRender:    [ ]
        };
        if (onInsert)  iView.on('insert', onInsert);

        if (iView !== this)  return iView;

        this.$_View = $_View.data('_LVI_', this);
        this.data = [ ];

        this.selector = $_Item;
        this.length = 0;

        for (;  ;  this.length++) {
            $_Item = this.itemOf(this.length);

            if (! $_Item.length)  break;

            this[this.length] = $_Item;
        }
        this.$_Template = this[0].clone(true);

//        this.limit = parseInt( this.$_View.attr('max') )  ||  Infinity;
//        this.limit = (this.data.length > this.limit) ? this.limit : this.data.length;
    }

    ListView.listSelector = 'ul, ol, dl, tbody, *[multiple]';

    function _Callback_(iType, $_Item, iValue, Index) {
        var iCallback = this.callback[iType],  iReturn,
            iArgs = ($_Item instanceof $)  ?
                [$_Item.data('LV_Model', iValue),  iValue,  Index]  :
                [$_Item];

        for (var i = 0;  i < iCallback.length;  i++)
            iReturn = iCallback[i].apply(this, iArgs);

        return iReturn;
    }

    function New_Item($_Item, Index) {
        var $_Clone = this.$_Template.clone(true);

        if (! Index)
            this.$_View.prepend($_Clone);
        else {
            if (! $_Item.length)
                this.itemOf(Index - 1).slice(-1).after($_Clone);
            else
                $_Item.eq(0).before($_Clone);
        }

        return $_Clone;
    }

    $.extend(ListView.prototype, {
        on:         function (iType, iCallback) {
            if (
                (typeof iType == 'string')  &&
                (typeof iCallback == 'function')  &&
                (this.callback[iType].indexOf(iCallback) == -1)
            )
                this.callback[iType].push(iCallback);

            return this;
        },
        itemOf:     function (Index) {
            Index = Index || 0;

            var $_Item = [ ];

            for (var i = 0, _Item_;  i < this.selector.length;  i++) {
                _Item_ = this.$_View.children( this.selector[i] ).eq(Index)[0];
                if (_Item_)  $_Item.push(_Item_);
            }
            return  $.extend($(), $_Item, {
                length:    $_Item.length
            });
        },
        slice:      Array.prototype.slice,
        splice:     Array.prototype.splice,
        indexOf:    function (Index) {
            if (! isNaN(parseInt( Index )))
                return  $(this.slice(Index,  ++Index ? Index : undefined)[0]);

            var $_Item = $(Index);

            for (var i = 0;  i < this.length;  i++)
                if (this[i].index($_Item[0]) > -1)
                    return i;
            return -1;
        },
        insert:     function (iValue, Index) {
            iValue = (iValue === undefined)  ?  { }  :  iValue;

            Index = parseInt(Index) || 0;
            Index = (Index < this.length)  ?  Index  :  this.length;

            var $_Item = this.itemOf(Index);

            if ((! $_Item.length)  ||  $_Item.hasClass('ListView_Item'))
                $_Item = New_Item.call(this, $_Item, Index);

            var _Index_ = (Index < 0)  ?  (Index - 1)  :  Index;

            var iReturn = _Callback_.call(
                    this,  'insert',  $_Item,  iValue,  _Index_
                );
            this.splice(
                Index,  0,  this.itemOf(_Index_).addClass('ListView_Item')
            );
            this.data.splice(
                Index,  0,  (iReturn === undefined) ? iValue : iReturn
            );

            return this.indexOf(_Index_);
        },
        render:     function (iData, DetachTemplate) {
            iData = $.likeArray(iData) ? iData : [iData];

            for (var i = 0;  i < iData.length;  i++)
                this.insert(iData[i], i);

            _Callback_.call(this, 'afterRender', iData);

            return this;
        },
        valueOf:    function (Index) {
            var iValue = this.data.slice(
                    Index,  ++Index ? Index : undefined
                )[0];
            return  (iValue === undefined) ? $.makeArray(this.data) : iValue;
        },
        remove:     function (Index) {
            var $_Item = this.indexOf(Index);

            if (typeof $_Item == 'number') {
                if ($_Item < 0)  return this;
                Index = $_Item;
                $_Item = this.indexOf(Index);
            }
            if (
                $_Item.length  &&
                (false !== _Callback_.call(
                    this,  'remove',  $_Item,  this.valueOf(Index),  Index
                ))
            ) {
                this.data.splice(Index, 1);
                $_Item.remove();
                this.splice(Index, 1);
            }

            return this;
        },
        clear:      function () {
            this.data = [ ];
            this.splice(0, this.length);
            this.$_View.empty();

            return this;
        },
        focus:      function () {
            var $_Item = this.indexOf( arguments[0] );

            if (typeof $_Item == 'number') {
                if ($_Item < 0)  return this;
                $_Item = this.indexOf($_Item);
            }
            if (this.$_View.css('position') == 'static')
                this.$_View.css('position', 'relative');

            this.$_View.children().removeClass('active');

            var iCoord = $_Item.addClass('active').position();

            this.$_View.animate({
                scrollTop:     this.$_View.scrollTop() + iCoord.top,
                scrollLeft:    this.$_View.scrollLeft() + iCoord.left
            });

            return this;
        }
    });

    $.ListView = ListView;


/* ---------- Base64 to Blob  v0.1 ---------- */

//  Thanks "axes" --- http://www.cnblogs.com/axes/p/4603984.html

    $.toBlob = function (iType, iString) {
        if (arguments.length == 1) {
            iString = iType.match(/^data:([^;]+);base64,(.+)/);
            iType = iString[1];
            iString = iString[2];
        }
        iString = BOM.atob(iString);

        var iBuffer = new ArrayBuffer(iString.length);
        var uBuffer = new Uint8Array(iBuffer);

        for (var i = 0;  i < iString.length;  i++)
            uBuffer[i] = iString.charCodeAt(i);

        var BlobBuilder = BOM.WebKitBlobBuilder || BOM.MozBlobBuilder;

        if (! BlobBuilder)
            return  new BOM.Blob([iBuffer],  {type: iType});

        var iBuilder = new BlobBuilder();
        iBuilder.append(iBuffer);
        return iBuilder.getBlob(iType);
    };

/* ---------- Hash Algorithm (Crypto API Wrapper)  v0.1 ---------- */

//  Thanks "emu" --- http://blog.csdn.net/emu/article/details/39618297

    function BufferToString(iBuffer){
        var iDataView = new DataView(iBuffer),
            iResult = [ ];

        for (var i = 0, iTemp;  i < iBuffer.byteLength;  i += 4) {
            iTemp = iDataView.getUint32(i).toString(16);
            iResult.push(
                ((iTemp.length == 8) ? '' : '0') + iTemp
            );
        }
        return iResult.join('');
    }

    $.dataHash = function (iAlgorithm, iData, iCallback, iFailback) {
        var iCrypto = BOM.crypto || BOM.msCrypto;
        var iSubtle = iCrypto.subtle || iCrypto.webkitSubtle;

        iAlgorithm = iAlgorithm || 'SHA-512';
        iFailback = iFailback || iCallback;

        try {
            iData = iData.split('');
            for (var i = 0;  i < iData.length;  i++)
                iData[i] = iData[i].charCodeAt(0);

            var iPromise = iSubtle.digest(
                    {name:  iAlgorithm},
                    new Uint8Array(iData)
                );

            if(typeof iPromise.then == 'function')
                iPromise.then(
                    function () {
                        iCallback.call(this, BufferToString(arguments[0]));
                    },
                    iFailback
                );
            else
                iPromise.oncomplete = function () {
                    iCallback.call(this,  BufferToString( arguments[0].target.result ));
                };
        } catch (iError) {
            iFailback(iError);
        }
    };

})(self, self.document, self.jQuery);