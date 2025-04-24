(function() {
    const currentScript = document.currentScript;
    const siteId = currentScript ? currentScript.getAttribute('data-site-id') : null;
    
    if (!siteId) {
        console.error("No site ID provided in the script tag.");
        return;
    }

    let userId;
    try {
        userId = currentScript.getAttribute('data-user-id');
        if (!userId) {
            userId = crypto.randomUUID();
            localStorage.setItem('uuid', userId);
        }
    } catch (error) {
        console.error("Error getting user ID from script tag:", error);
        userId = 'uuid-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    }

    // Get IP address first
    fetch('https://api.ipify.org?format=json')
        .then(response => response.json())
        .then(data => {
            const trackingData = {
                siteId: siteId,        
                uuid: userId,          
                url: window.location.href,
                referrer: document.referrer,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
                ip: data.ip
            };

            return fetch("http://localhost:3000/api/track", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(trackingData)
            });
        })
        .catch(err => console.error("Tracking request failed:", err));
})();
