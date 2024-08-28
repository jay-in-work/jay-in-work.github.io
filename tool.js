(function() {
    'use strict';

    // set history storage key
    const HISTORY_STORAGE_KEY = 'bwVisistHistory';

    var wrapper = document.createElement('div');
    
    // create validation area
    var elem = document.createElement('div');
    elem.setAttribute("id", "pixel-validation");
    elem.setAttribute("style", "position: fixed; bottom:0; right:0; z-index: 999; display: block; background-color: white; border: 1px solid rgba(0,0,0, 0.5); border-radius:10px 0 0 0; padding: 10px; text-align: left; max-height: 50%; overflow: auto;");
    
    var button = document.createElement('button');
    button.setAttribute("id", "pixel-show");
    button.setAttribute("style", "position: fixed;right: 0px;z-index: 999; bottom: 50%; background: rgba(0, 0, 0, 0); border: 0px; padding: 3px; border-radius: 20px; font-size: 20px;");
    button.textContent = "🔧";

    wrapper.appendChild(elem);
    wrapper.appendChild(button);

    var bodyHtml = document.getElementsByTagName('body');
    bodyHtml[0].prepend(wrapper);

    // get pixel validation area element
    var pixelValidationElem = document.getElementById('pixel-validation');
    var cookieId = getCookie('__BWfp');

    pixelValidationElem.innerHTML += `<div id ="bw-cookie">1st cookie: ${cookieId}</div>`;

    setTimeout(function(){
        if(window.bw){
            appendSessionIdAndEngagementTime();
            setValueChecker();
            appendHistoryTable();
            refreshHistoryTable();
            document.getElementById('bw-eventHistoryBtn').addEventListener('click', () => {
                let table = document.getElementById('bw-eventHistoryTable');
                table.style.display = !table.style.display | table.style.display === 'none' ? 'table' : 'none';
            });
        
            document.getElementById('bw-clearEventHistoryBtn').addEventListener('click', () => {
                window.localStorage.removeItem(HISTORY_STORAGE_KEY);
                refreshHistoryTable();
            });
            document.getElementById('pixel-show').addEventListener('click', () => {
                let block = document.getElementById('pixel-validation');
                block.style.display = !block.style.display | block.style.display === 'none' ? 'block' : 'none';
            });
        }
    }, 3000);

    function appendHistoryTable(){
        const styleTag = document.createElement('style');
        styleTag.textContent = `
            .bw-log-table {
                width: 100%;
                border-collapse: collapse;
                display: none;
                font-size: 10px;
            }
        
            .bw-log-table th, .bw-log-table td {
                padding: 2px;
                border: 1px solid #dddddd;
                text-align: left;
                max-width:300px;
                word-break: break-word;
            }
        
            #bw-eventHistoryBtn, #bw-clearEventHistoryBtn {
                background-color: #ffffff;
                border: 2px solid #6c757d;
                border-radius: 5px;
                padding: 3px;
                margin-top: 10px;
                margin-bottom: 10px;
                margin-right: 10px;
                cursor: pointer;
                font-size: 12px;
            }
        `;
        document.head.appendChild(styleTag);
        pixelValidationElem.innerHTML += `<button id="bw-eventHistoryBtn">Show Eng. Hist.</button>`;
        pixelValidationElem.innerHTML += `<button id="bw-clearEventHistoryBtn">Clear Eng. Hist.</button>`;
        pixelValidationElem.innerHTML += `
            <table class="bw-log-table" id="bw-eventHistoryTable">
                <thead>
                    <tr>
                        <th>URL</th>
                        <th>Session ID</th>
                        <th>Eng. Time</th>
                    </tr>
                </thead>
                <tbody id="bw-eventHistoryTableBody">
                </tbody>
            </table>
        `;
    }

    function refreshHistoryTable(){
        var history = getStoredEventHistory();
        const logBody = document.getElementById('bw-eventHistoryTableBody');
        logBody.innerHTML = '';
        history.forEach((log) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${decodeURIComponent(log['browser[url]'])}</td>
                <td>${log['sid']}</td>
                <td>${log['egt']}</td>
            `;
            logBody.appendChild(row);
        });
    }

    function appendSessionIdAndEngagementTime(){
        var ready = false;
        while(!ready){
            ready = !!(window.bw?.pixelIds && Object.keys(window.bw.pixelIds).length >= 1);
            console.log(ready);
            if(ready){
                Object.keys(window.bw.pixelIds).forEach(id => {
                    pixelValidationElem.innerHTML += `<div id ="pxiel-${id}">pixel id: ${id} @ ${window._bw.version}`+
                        `<div class='session-id'></div>`+
                        `<div class="engagement-time"></div></div>`;
                    document.getElementById(`pxiel-${id}`).getElementsByClassName('session-id')[0].innerHTML = `Session: ${getFirstPartyLocalStorageItem(`__BW_${id}`)}`;
                });
            }
        }
    }

    function setValueChecker(){
        // set Interval
        setInterval(function (){
            Object.keys(window.bw.pixelIds).forEach(id => {
                var temp = document.getElementById(`pxiel-${id}`).getElementsByClassName('engagement-time')[0];
                temp.innerHTML = `<div>Engagement Time: ${Math.floor(window.bw.engagementTracker[id].getCurrentEngagementTime() / 1000)}</div>`;
            });
        }, 1);

        // set Interval
        setInterval(function (){
            Object.keys(window.bw.pixelIds).forEach(id => {
                var newSessionId = `Session: ${getFirstPartyLocalStorageItem(`__BW_${id}`)}`
                var sessionElem = document.getElementById(`pxiel-${id}`).getElementsByClassName('session-id')[0]
                var innerHtml = sessionElem.innerHTML;
                if(innerHtml != newSessionId){
                    sessionElem.innerHTML = newSessionId;
                }
            })
        }, 1000);
    }

    // 覆寫sendBeacon, 攔截請求
    const originalSendBeacon = navigator.sendBeacon;
    navigator.sendBeacon = function(url, data) {
        if(url.includes('pixel-api.scupio.com')){
            let history =  getStoredEventHistory();
            let keys = ['browser[url]', 'sid', 'egt'];
            let dict = {}
            for (let pair of data.entries()) {
                let [key, value] = pair;
                if (keys.includes(key)) {
                    dict[key] = value;
                }
            }
            history.push(dict);
            saveStoredEventHistory(history);
        }

        // 原始navigator
        return originalSendBeacon.apply(navigator, arguments);
    };

    function saveStoredEventHistory(logs) {
        window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(logs));
    };

    function getStoredEventHistory() {
        var history;
        try {
            history= JSON.parse(getFirstPartyLocalStorageItem(HISTORY_STORAGE_KEY));
        } catch (err) {
            // Do nothing.
            console.log(err);
        }
        return history || [];
    };

    // utils function
    function getCookie(key) {
        var result = '',
            cookieList,
            cookieValue,
            i;

        // get cookie id first
        try {
            key = decodeURIComponent(key);
            cookieList = document.cookie.split(';');
            i = cookieList.length - 1;
            while (i >= 0) {
                cookieValue = cookieList[i].trim();
                if (cookieValue.indexOf(key) === 0) {
                    result = cookieValue.substring(key.length + 1, cookieValue.length);
                }
                i -= 1;
            }
            result = decodeURIComponent(result);
        } catch (ignore) {
            // ignore
        }

        return result;
    }

    var localStorageAvailable = (typeof localStorage === 'object' && localStorage !== null && typeof localStorage.getItem === 'function' && typeof localStorage.setItem === 'function');
    function getFirstPartyLocalStorageItem(keyName) {
        var keyValue = '';
        try {
            if (localStorageAvailable) {
                // keyValue would be null if keyName doesn't exist
                keyValue = window.localStorage.getItem(keyName) || '';
            }
        } catch (ignore) {
            // ignore exception
            console.log("can not get");
        }
        return keyValue;
    }
})();