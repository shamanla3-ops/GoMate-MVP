self.addEventListener("install", () => {
    self.skipWaiting();
  });
  
  self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
  });
  
  self.addEventListener("push", (event) => {
    let payload = {};
  
    try {
      payload = event.data ? event.data.json() : {};
    } catch {
      payload = {
        title: "GoMate",
        body: event.data ? event.data.text() : "",
        url: "/",
      };
    }
  
    const title = payload.title || "GoMate";
    const options = {
      body: payload.body || "",
      icon: "/gomate-logo.png",
      badge: "/gomate-logo.png",
      data: {
        url: payload.url || "/",
      },
    };
  
    event.waitUntil(self.registration.showNotification(title, options));
  });
  
  self.addEventListener("notificationclick", (event) => {
    event.notification.close();
  
    const targetUrl = event.notification.data?.url || "/";
  
    event.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
  
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
    );
  });