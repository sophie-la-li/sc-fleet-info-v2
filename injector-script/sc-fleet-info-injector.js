if (typeof SFI_ASYNC == undefined) {
    var SFI_ASYNC = false;
}

if (SFI_ASYNC != true) {
    SFI_ASYNC = true;
    let widget = document.createElement('script');
    //widget.setAttribute('src', 'https://sophie-la-li.github.io/sc-fleet-info/fleetInfo.js');
    widget.setAttribute('src', 'https://github.com/sophie-la-li/sc-fleet-info-v2/releases/latest/download/sc-fleet-info.js');
    widget.setAttribute('async', 'async');
    document.body.appendChild(widget);
}

