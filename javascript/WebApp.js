define(['jquery', 'UI_Module'],  function ($, UI_Module) {

    var BOM = self,  DOM = self.document;

    function WebApp() {
        var iApp = $('#EWA_ViewPort').data('_EWA_') || this;

        if (iApp !== this)  return iApp;

        $.Observer.call(this, 1);

        this.$_Root = $( arguments[0] ).data('_EWA_', this)
            .prop('id', 'EWA_ViewPort');

        this.apiPath = arguments[1];

        this.length = 0;
        this.lastPage = -1;

        $(BOM).on('popstate',  function () {
            var Index = arguments[0].originalEvent.state.index;

            iApp[iApp.lastPage].detach();
            iApp[iApp.lastPage = Index].attach();
        });

        this.boot();
    }

    WebApp.$_Link = '*[target]:not(a)';

    WebApp.prototype = $.extend(new $.Observer(),  {
        constructor:    WebApp,
        push:           Array.prototype.push,
        splice:         Array.prototype.splice,
        boot:           function () {
            var $_Module = $(arguments[0] || 'body')
                    .find('*[href]:not(a, link), *[src]:not(img, iframe, script)')
                    .not(this.constructor.$_Link + ', *[href]:parent');

            for (var i = 0;  $_Module[i];  i++)
                (new UI_Module(this, $_Module[i])).load();

            return this;
        },
        register:       function (iPage) {
            if (this.$_Root[0] !== iPage.$_Root[0])  return;

            if (this.lastPage > -1)  this[this.lastPage].detach();

            if (++this.lastPage != this.length)
                this.splice(this.lastPage, this.length);

            BOM.history.pushState(
                {index: this.length},  iPage.title || DOM.title,  DOM.URL
            );
            this.push( iPage );

            return this;
        }
    });

    return WebApp;

});