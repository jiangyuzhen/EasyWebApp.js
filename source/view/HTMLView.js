define([
    'jquery', './View', './DOMkit', './RenderNode', 'jQueryKit'
],  function ($, View, DOMkit, RenderNode) {

    function HTMLView($_View, iScope) {

        var _This_ = View.call(this, $_View, iScope);

        return  (_This_ !== this)  ?
            _This_ :
            this.setPrivate( {length: 0,  map: { }} );
    }

    return  View.extend(HTMLView, {
        is:             function () {

            return  (! $.expr[':'].list( arguments[0] ));
        },
        rawSelector:    $.makeSet('code', 'xmp', 'template')
    }, {
        signIn:        function (iNode) {

            for (var i = 0;  this[i];  i++)  if (this[i] == iNode)  return;

            this[this.length++] = iNode;

            var iName = (iNode instanceof RenderNode)  ?  iNode  :  [
                    iNode.__name__  ||  iNode.name
                ];

            for (var j = 0;  iName[j];  j++)
                this.__map__[iName[j]] = (this.__map__[iName[j]] || 0)  +
                    Math.pow(2, i);
        },
        parsePlain:    function (iDOM) {

            var _This_ = this;

            $.each(
                Array.prototype.concat.apply(
                    $.makeArray( iDOM.attributes ),  iDOM.childNodes
                ),
                function () {
                    if ((! this.nodeValue)  ||  (
                        (this.nodeType != 2)  &&  (this.nodeType != 3)
                    ))
                        return;

                    var iTemplate = new RenderNode( this );

                    if (! iTemplate[0])  return;

                    _This_.signIn( iTemplate );

                    if ((! this.nodeValue)  &&  (this.nodeType == 2)  &&  (
                        ($.propFix[this.nodeName] || this.nodeName)  in
                        this.ownerElement
                    ))
                        this.ownerElement.removeAttribute( this.nodeName );
                }
            );
        },
        parse:         function () {

            return  this.scan(function (iNode) {

                var $_View = this.$_View,
                    tag = (iNode.tagName || '').toLowerCase();

                if ((iNode instanceof Element)  &&  (iNode !== $_View[0]))
                    switch ( tag ) {
                        case 'link':      {
                            if (('rel' in iNode)  &&  (iNode.rel != 'stylesheet'))
                                break;

                            iNode.onload = function () {

                                $( this ).replaceWith(
                                    DOMkit.fixStyle($_View, this)
                                );
                            };
                            return;
                        }
                        case 'style':     return  DOMkit.fixStyle($_View, iNode);
                        case 'script':    return  DOMkit.fixScript( iNode );
                    }

                switch (true) {
                    case (iNode instanceof View):
                        this.signIn( iNode );    break;
                    case (
                        $.expr[':'].field( iNode )  &&  (iNode.type != 'file')  &&
                        (! iNode.defaultValue)
                    ):
                        this.signIn( iNode );

                    case !(tag in HTMLView.rawSelector):
                        this.parsePlain( iNode );
                }
            });
        },
        getNode:       function (data, exclude) {

            var iMask = '0',  _This_ = this;

            for (var iName in data)
                if (this.__map__.hasOwnProperty( iName ))
                    iMask = $.bitOperate('|',  iMask,  this.__map__[ iName ]);

            return $.map(
                $.leftPad(iMask, this.length).split('').reverse(),
                function (bit, node) {

                    node = _This_[ node ];

                    if ((node !== exclude)  &&  (
                        (bit > 0)  ||  ((node || '').type > 1)
                    ))
                        return node;
                }
            );
        },
        render:        function render(iData, value) {

            var _This_ = this,  _Data_ = { },  exclude;

            if (iData instanceof Element) {

                exclude = iData;

                iData = exclude.name || exclude.getAttribute('name');

                value = $( exclude )[('value' in exclude)  ?  'val'  :  'html']();
            }

            if (typeof iData.valueOf() === 'string') {

                _Data_[iData] = value;    iData = _Data_;
            }

            iData = this.commit( iData );  _Data_ = this.__data__;

            for (var iKey in iData)  this.watch(iKey, render);

            if ( iData )
                $.each(this.getNode(iData, exclude),  function () {

                    if (this instanceof RenderNode)
                        this.render(_This_, _Data_);
                    else if (this instanceof View)
                        this.render(_Data_[this.__name__]);
                    else
                        $( this )[
                            ('value' in this)  ?  'val'  :  'html'
                        ](
                            _Data_[this.name || this.getAttribute('name')]
                        );
                });

            return this;
        }
    }).registerEvent('template');

});