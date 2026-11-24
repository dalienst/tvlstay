// Service worker for the staff admin (scope /admin/): shows push alerts for guest requests
// and opens the right page when one is tapped. Guests never load this.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let msg = { title: "Guest guide", body: "You have a new alert.", url: "/admin/requests" };
  try {
    msg = { ...msg, ...event.data.json() };
  } catch {}
  event.waitUntil(
    self.registration.showNotification(msg.title, {
      body: msg.body,
      icon: "/logos/tvllogo.png",
      badge: "/logos/tvllogo.png",
      tag: msg.tag,
      renotify: !!msg.tag,
      requireInteraction: true,
      data: { url: msg.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/admin/requests", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.location.origin + "/admin") && "focus" in c) {
          c.navigate(url).catch(() => {});
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
