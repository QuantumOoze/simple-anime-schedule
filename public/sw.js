const CACHE_NAME = "anikai-schedule-board-v1";
const APP_SHELL = ["/", "/index.html", "/manifest.webmanifest", "/pwa-icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(cacheNames.filter((cacheName) => cacheName !== CACHE_NAME).map((cacheName) => caches.delete(cacheName))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(caches.match(event.request).then((cachedResponse) => cachedResponse || fetch(event.request)));
});

const MAX_REMINDER_KEY_LENGTH = 256;
const MAX_TITLE_LENGTH = 240;
const MAX_BODY_LENGTH = 320;

function isPositiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function parseReleaseReminderPayload(event) {
  if (!event.data) {
    return null;
  }

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return null;
  }

  if (!payload || payload.type !== "release-reminder") {
    return null;
  }

  const reminderKey = payload.reminderKey;
  const displayTitle = payload.displayTitle;
  const title = payload.title;
  const body = payload.body;

  if (
    typeof reminderKey !== "string" ||
    reminderKey.length === 0 ||
    reminderKey.length > MAX_REMINDER_KEY_LENGTH ||
    !/^[a-zA-Z0-9:_-]+$/.test(reminderKey) ||
    typeof displayTitle !== "string" ||
    displayTitle.length === 0 ||
    displayTitle.length > MAX_TITLE_LENGTH ||
    typeof title !== "string" ||
    title.length === 0 ||
    title.length > 80 ||
    typeof body !== "string" ||
    body.length === 0 ||
    body.length > MAX_BODY_LENGTH ||
    !isPositiveInteger(payload.mediaId) ||
    !isPositiveInteger(payload.episode) ||
    !isPositiveInteger(payload.airingAt)
  ) {
    return null;
  }

  return {
    reminderKey,
    mediaId: payload.mediaId,
    episode: payload.episode,
    airingAt: payload.airingAt,
    title: "Anime release reminder",
    body: `${displayTitle} — EP ${payload.episode} is airing now`,
  };
}

async function displayReleaseReminder(event) {
  const payload = parseReleaseReminderPayload(event);
  if (!payload) {
    return;
  }

  await self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: "/pwa-icon.svg",
    tag: `release-reminder:${payload.reminderKey}`,
    renotify: false,
    data: {
      type: "release-reminder",
      reminderKey: payload.reminderKey,
      mediaId: payload.mediaId,
      episode: payload.episode,
      airingAt: payload.airingAt,
    },
  });
}

self.addEventListener("push", (event) => {
  event.waitUntil(
    displayReleaseReminder(event).catch(() => {
      // Malformed payloads and notification failures must not terminate the worker.
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existingClient = clients.find((client) => {
          try {
            return new URL(client.url).origin === self.location.origin;
          } catch {
            return false;
          }
        });

        if (existingClient && "focus" in existingClient) {
          return existingClient.focus();
        }

        return self.clients.openWindow(new URL("/", self.location.origin).href);
      })
      .catch(() => {
        // A closed or unavailable client should not surface an unhandled rejection.
      }),
  );
});
