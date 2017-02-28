define(['jquery', 'Node_Template', 'iQuery+'],  function ($, Node_Template) {

    function HTMLView($_View) {

        this.$_View = $( $_View );

        this.length = 0;

        this.__map__ = { };

        this.__data__ = { };

        var _This_ = this.parse();

        this.$_View.on('input change',  ':field',  $.throttle(function () {
            _This_.render(
                this.name || this.getAttribute('name'),  $(this).value('name')
            );
        }));
    }

    HTMLView.rawSelector = 'code, xmp, template';

    $.extend(HTMLView.prototype, {
        watch:         function (iKey) {
            var _This_ = this;

            if (! (iKey in this))
                Object.defineProperty(this, iKey, {
                    get:    function () {
                        return _This_.__data__[iKey];
                    },
                    set:    function () {
                        _This_.render(iKey, arguments[0]);
                    }
                });
        },
        signIn:        function (iNode, iName) {

            for (var i = 0;  this[i];  i++)  if (this[i] == iNode)  return;

            this[this.length++] = iNode;

            for (var j = 0;  iName[j];  j++) {
                this.__map__[iName[j]] = (this.__map__[iName[j]] || 0)  +
                    Math.pow(2, i);

                if ( $.browser.modern )  this.watch( iName[j] );
            }
        },
        parsePlain:    function (iDOM) {
            var _This_ = this;

            $.each(
                Array.prototype.concat.apply(
                    $.makeArray( iDOM.attributes ),  iDOM.childNodes
                ),
                function () {
                    if ((this.nodeType != 2)  &&  (this.nodeType != 3))
                        return;

                    var iTemplate = new Node_Template( this );

                    var iName = iTemplate.getRefer();

                    if (! iName[0])  return;

                    _This_.signIn(iTemplate, iName);

                    if ((! this.nodeValue)  &&  (this.nodeType == 2))
                        this.ownerElement.removeAttribute( this.nodeName );
                }
            );
        },
        parse:         function () {
            var _This_ = this;

            this.$_View.each(function () {

                var $_All = $('*', this).add( this );

                var $_Input = $_All.filter(':field');

                for (var i = 0;  $_Input[i];  i++)
                    _This_.signIn($_Input[i], [$_Input[i].name]);

                var $_Plain = $_All.not( HTMLView.rawSelector );

                for (var i = 0;  $_Plain[i];  i++)
                    _This_.parsePlain( $_Plain[i] );
            });

            return this;
        },
        getNode:       function () {
            var iMask = '0',  _This_ = this;

            for (var iName in arguments[0])
                if (this.__map__.hasOwnProperty( iName ))
                    iMask = $.bitOperate('|',  iMask,  this.__map__[ iName ]);

            return  $.map(iMask.split('').reverse(),  function () {

                return  (arguments[0] > 0)  ?  _This_[ arguments[1] ]  :  null;
            });
        },
        render:        function (iData) {

            if (typeof iData.valueOf() == 'string') {
                var _Data_ = { };
                _Data_[iData] = arguments[1];
                iData = _Data_;
            }

            $.extend(this.__data__, iData);

            $.each(this.getNode( iData ),  function () {

                if (this instanceof Node_Template)
                    this.render( iData );
                else
                    $( this )[
                        ('value' in this)  ?  'val'  :  'html'
                    ](
                        iData[this.name || this.getAttribute('name')]
                    );
            });

            return this;
        }
    });

    return HTMLView;

});