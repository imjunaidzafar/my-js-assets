(function () {
  const currentScript = document.currentScript;
  console.log(`current`, currentScript)
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

  // Session tracking
  let sessionId = sessionStorage.getItem('session_id');
  let isNewSession = false;
  let pageViews = parseInt(sessionStorage.getItem('page_views') || '0');
  let sessionStartTime = sessionStorage.getItem('session_start_time');
  let isContactPage = window.location.href.includes('/contact');

  // Initialize session if it doesn't exist
  if (!sessionId) {
    sessionId = 'session-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    sessionStartTime = Date.now();
    isNewSession = true;
    sessionStorage.setItem('session_id', sessionId);
    sessionStorage.setItem('session_start_time', sessionStartTime);
    sessionStorage.setItem('page_views', '0');
  }

  // Increment page views - this counts how many pages the user has viewed in this session
  // This data is sent to the tracking API to analyze user engagement
  pageViews++;
  sessionStorage.setItem('page_views', pageViews.toString());

  // Calculate session duration in minutes
  const sessionDuration = sessionStartTime ? (Date.now() - parseInt(sessionStartTime)) / 60000 : 0;

  // Get IP address first
  fetch('https://api.ipify.org?format=json')
    .then(response => response.json())
    .then(data => {
      const trackingData = {
        siteId: siteId,
        uuid: userId,
        sessionId: sessionId,
        url: window.location.href,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        ip: data.ip,
        isNewSession: isNewSession,  // boolean
        pageViews: pageViews,        // number
        sessionDuration: sessionDuration,  // number (minutes)
        isContactPage: isContactPage  // boolean
      };

      // Initial tracking call - creates or updates the session object
      return fetch("https://528d-39-63-38-4.ngrok-free.app/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trackingData)
      })
        .then(response => response.json())
        .then(data => {
          // Store the tracking object ID for future updates
          if (data && data.trackingId) {
            sessionStorage.setItem('tracking_id', data.trackingId);
          }
          return data;
        });
    })
    .then(initialData => {
      // If this is a contact page, send additional conversion data
      if (isContactPage) {
        const trackingId = sessionStorage.getItem('tracking_id');
        if (trackingId) {
          const conversionData = {
            trackingId: trackingId,
            conversionType: 'contact_page_visit',
            timestamp: new Date().toISOString()
          };

          return fetch("https://528d-39-63-38-4.ngrok-free.app/api/track/conversion", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(conversionData)
          });
        }
      }
    })
    .catch(err => console.error("Tracking request failed:", err));

  // Add event listener for page visibility changes to update session metrics
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      const trackingId = sessionStorage.getItem('tracking_id');
      if (trackingId) {
        const sessionUpdateData = {
          trackingId: trackingId,
          sessionDuration: (Date.now() - parseInt(sessionStorage.getItem('session_start_time') || '0')) / 60000,
          pageViews: parseInt(sessionStorage.getItem('page_views') || '0')
        };

        // Use sendBeacon for more reliable data sending when page is unloading
        navigator.sendBeacon(
          "https://528d-39-63-38-4.ngrok-free.app/api/track/update-session",
          JSON.stringify(sessionUpdateData)
        );
      }
    }
  });
})();