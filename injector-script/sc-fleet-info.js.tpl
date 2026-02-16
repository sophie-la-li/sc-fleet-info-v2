function scfi_wrapper() {
    console.log('init SC Fleet Info');

    const SCFI_CSS = `
##CSS##

        #scfi_wrapper {
            width: 100%;
            height: 100%;
            z-index: 9999;
            position: absolute;
            left: 0;
            top: -100px;
            background-color: rgba(0, 0, 0, 0.5);
        }

        #scfi {
            background: #111;
            margin: 30px;
            border-radius: 10px;
            box-shadow: 0px 0px 20px rgba(0, 0, 0, 0.5);
            position: relative;
            padding: 20px 20px 20px 10px;
            min-height: 100%;
        }

        #scfi h1 {
            margin-top: 0;
        }

        #scfi #sidebar {  
            position: relative;
            float: left;
        }

        #scfi #data:after {
            content: '';
            display: block;
            clear: both;
        }

        #scfi #window_menu {
            display: block;
            position: absolute;
            right: 30px;
            top: -6px;
        }

        #scfi #close_button {
        }

        #scfi li.card {
            margin: 8px;
        }
    `;

    const SCFI_HTML = `
##HTML##
    `;

##SCRIPT##

    injector_main = function() {
        $('head').append('<style>' + SCFI_CSS + '</style>');
        $('#bodyWrapper').prepend(SCFI_HTML)
        $('#scfi_wrapper').hide();
        $('#close_button', $('#scfi')).on('click', function() {
            $('#scfi_wrapper').hide();
        });

        main($('#scfi'), false);

        let nav = $('div.sidenav ul li');
        if (nav.length > 0) {
            let newNav = $(nav[0]).clone();
            newNav.removeClass('active');
            newNav.find('.bg').text('MY FLEET');
            newNav.find('a').attr('href', 'javascript:void(0);');
            newNav.find('a').click(function(){ 
                $('#scfi_wrapper').show();
                update_data_and_list();
                $(window).scrollTop(0);
            });
            $('div.sidenav ul').prepend(newNav);
        }

        // CIG seams to store the pagesize in session.
        // Since we overwrite it with 1 in pledge deeplinks,
        // we have to fix it in all other links to the pledges list.
        $("a").each((index, element) => {
            let href = $(element).attr('href');
            if (href != undefined && href.search(/^\/account\/pledges/i) != -1) {
                href = href.replace(/(\&|)pagesize\=\d+(\&|)/, "");
                let delim = '?';
                if (href.search(/\?/) != -1) delim = '&';
                $(element).attr('href', href + delim + 'pagesize=10');
            }
        });
    };

    injector_main();
};

function scfi_wait_for_jquery(method) {
    if (window.jQuery) {
        method();
    } else {
        setTimeout(function() { scfi_wait_for_jquery(method) }, 50);
    }
}

if (typeof SCFI_DONE == undefined) {
    var SCFI_DONE = false;
}

if (SCFI_DONE != true) {
    SCFI_DONE = true;
    scfi_wait_for_jquery(scfi_wrapper);
}

