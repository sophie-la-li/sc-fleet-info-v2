chrome.action.onClicked.addListener(function() {
    chrome.tabs.query({'title': 'SC Fleet Info'}, function(tabs) {
        if (tabs && tabs.length > 0) {
            chrome.tabs.update(tabs[0].id, {'active': true});
        } else {
            chrome.tabs.create({'url':'/sc-fleet-info.html'});
        }
    });
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    fetch(request.input, request.init).then(function(response) {
        return response.text().then(function(text) {
            sendResponse([{
                body: text,
                status: response.status,
                statusText: response.statusText
            }, null]);
        });
    }, function(error) {
        sendResponse([null, error]);
    });
    return true;
});

