define(['jquery'],  function ($) {

    function Node_Template(iNode) {
        this.ownerNode = iNode;

        this.raw = iNode.nodeValue;

        this.ownerElement = iNode.parentNode || iNode.ownerElement;
    }

    Node_Template.expression = /\$\{([\s\S]+?)\}/g;

    Node_Template.reference = /this\.(\w+)/;

    try {
        eval('``');

        var ES_ST = function () {
                var iValue = eval('`' + arguments[0] + '`');

                return  (iValue != null)  ?  iValue  :  '';
            };
    } catch (iError) {
        var Eval_This = function () {
                var iValue = eval( arguments[0] );

                return  (iValue != null)  ?  iValue  :  '';
            };
    }

    $.extend(Node_Template.prototype, {
        eval:        function (iContext) {
            return  ES_ST  ?  ES_ST.call(iContext, this.raw)  :
                this.raw.replace(Node_Template.expression,  function () {

                    return  Eval_This.call(iContext, arguments[1]);
                });
        },
        getRefer:    function (iData) {
            var iRefer = $.isEmptyObject( iData )  ?  [ ]  :  { };

            this.ownerNode.nodeValue = this.raw.replace(
                Node_Template.expression,
                function () {
                    arguments[1].replace(
                        Node_Template.reference,
                        function (_, iName) {
                            if (iRefer instanceof Array)
                                iRefer.push( iName );
                            else
                                iRefer[ iName ] = iData[ iName ];
                        }
                    );

                    return '';
                }
            );

            return iRefer;
        },
        render:      function () {
            var iValue = this.eval( arguments[0] ),
                iNode = this.ownerNode,
                iParent = this.ownerElement;

            switch ( iNode.nodeType ) {
                case 3:    {
                    if (! (iNode.previousSibling || iNode.nextSibling))
                        return  iParent.innerHTML = iValue;

                    break;
                }
                case 2:    if (iNode.nodeName in iParent) {
                    if ( iValue )  try {
                        iValue = eval( iValue );
                    } catch (iError) { }

                    iParent[ iNode.nodeName ] = iValue;

                    return;

                } else if (! iNode.ownerElement) {
                    if ( iValue )
                        iParent.setAttribute(iNode.nodeName, iValue);

                    return;
                }
            }

            iNode.nodeValue = iValue;
        }
    });

    return Node_Template;

});