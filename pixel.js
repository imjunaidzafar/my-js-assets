  (function () {
    const currentScript = document.currentScript;
    const siteId = currentScript ? currentScript.getAttribute('data-site-id') : null;

    if (!siteId) {
      console.error("No site ID provided in the script tag.");
      return;
    }

    let userId;
    try {
      userId = localStorage.getItem('uuid');
      if (!userId) {
        userId = crypto.randomUUID();
        localStorage.setItem('uuid', userId);
      }
    } catch (error) {
      userId = 'uuid-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    }

    function trackPageVisit() {
      let sessionId = sessionStorage.getItem('session_id');
      let isNewSession = false;
      let pageViews = parseInt(sessionStorage.getItem('page_views') || '0');
      let sessionStartTime = sessionStorage.getItem('session_start_time');
      let trackingId = sessionStorage.getItem('tracking_id');
      let isContactPage = window.location.href.includes('/contact');

      if (!sessionId) {
        sessionId = 'session-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        sessionStartTime = Date.now();
        isNewSession = true;
        sessionStorage.setItem('session_id', sessionId);
        sessionStorage.setItem('session_start_time', sessionStartTime);
        sessionStorage.setItem('page_views', '0');
        sessionStorage.setItem('visited_pages', JSON.stringify([]));
      }

      pageViews++;
      sessionStorage.setItem('page_views', pageViews.toString());

      let visitedPages = JSON.parse(sessionStorage.getItem('visited_pages') || '[]');
      visitedPages.push({
        url: window.location.href,
        timestamp: new Date().toISOString()
      });
      sessionStorage.setItem('visited_pages', JSON.stringify(visitedPages));

      const sessionDuration = sessionStartTime ? (Date.now() - parseInt(sessionStartTime)) / 60000 : 0;

      fetch('https://api.ipify.org?format=json')
        .then(res => res.json())
        .then(data => {
          const trackingData = {
            siteId,
            uuid: userId,
            sessionId,
            url: window.location.href,
            referrer: document.referrer,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            ip: data.ip,
            isNewSession,
            pageViews,
            sessionDuration,
            isContactPage,
            visitedPages,
            trackingId
          };

          return fetch("https://2f376f1fae13.ngrok-free.app/api/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(trackingData)
          }).then(res => res.json())
            .then(data => {
              if (data && data.trackingId) {
                sessionStorage.setItem('tracking_id', data.trackingId);
              }
            });
        });
    }

    // ▶️ Trigger on page load
    trackPageVisit();

    // ▶️ Trigger on browser navigation
    window.addEventListener('popstate', trackPageVisit);

    // ▶️ Trigger on pushState/replaceState (internal navigation)
    const originalPushState = history.pushState;
    history.pushState = function () {
      originalPushState.apply(this, arguments);
      trackPageVisit();
    };
    const originalReplaceState = history.replaceState;
    history.replaceState = function () {
      originalReplaceState.apply(this, arguments);
      trackPageVisit();
    };

    // ▶️ Optional: on visibility change (session update)
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') {
        const trackingId = sessionStorage.getItem('tracking_id');
        if (trackingId) {
          const sessionUpdateData = {
            trackingId,
            sessionDuration: (Date.now() - parseInt(sessionStorage.getItem('session_start_time') || '0')) / 60000,
            pageViews: parseInt(sessionStorage.getItem('page_views') || '0'),
            visitedPages: JSON.parse(sessionStorage.getItem('visited_pages') || '[]')
          };
          navigator.sendBeacon("https://2f376f1fae13.ngrok-free.app/api/track/update-session", JSON.stringify(sessionUpdateData));
        }
      }
    });
  })();
