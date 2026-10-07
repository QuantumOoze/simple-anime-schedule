import type { ReleaseReminder } from "../types";

const BACKEND_SUBSCRIPTION_ID_KEY = "anikai-schedule-push-subscription-id";
const PENDING_SYNC_KEY = "anikai-schedule-push-sync";
const PERMISSION_PROMPT_KEY = "anime-schedule-notification-permission-asked";

type PendingSync = {
  registrations: Record<string, ReleaseReminder>;
  cancellations: Record<string, true>;
  clear: boolean;
};

const EMPTY_PENDING_SYNC: PendingSync = { registrations: {}, cancellations: {}, clear: false };

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

function readBackendSubscriptionId() {
  try {
    return window.localStorage.getItem(BACKEND_SUBSCRIPTION_ID_KEY);
  } catch {
    return null;
  }
}

function writeBackendSubscriptionId(subscriptionId: string) {
  try {
    window.localStorage.setItem(BACKEND_SUBSCRIPTION_ID_KEY, subscriptionId);
  } catch {
    // Push can still work for the current session if storage is unavailable.
  }
}

function readPendingSync(): PendingSync {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PENDING_SYNC_KEY) ?? "null") as Partial<PendingSync> | null;
    if (!parsed || typeof parsed !== "object") {
      return { ...EMPTY_PENDING_SYNC };
    }

    return {
      registrations: parsed.registrations && typeof parsed.registrations === "object" ? parsed.registrations : {},
      cancellations: parsed.cancellations && typeof parsed.cancellations === "object" ? parsed.cancellations : {},
      clear: parsed.clear === true,
    };
  } catch {
    return { ...EMPTY_PENDING_SYNC };
  }
}

function writePendingSync(sync: PendingSync) {
  try {
    if (!sync.clear && Object.keys(sync.registrations).length === 0 && Object.keys(sync.cancellations).length === 0) {
      window.localStorage.removeItem(PENDING_SYNC_KEY);
    } else {
      window.localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(sync));
    }
  } catch {
    // Local reminder state remains authoritative if sync storage is unavailable.
  }
}

function queueRegistration(reminder: ReleaseReminder) {
  const sync = readPendingSync();
  sync.registrations[reminder.id] = reminder;
  delete sync.cancellations[reminder.id];
  sync.clear = false;
  writePendingSync(sync);
}

function queueCancellation(reminderKey: string) {
  const sync = readPendingSync();
  delete sync.registrations[reminderKey];
  sync.cancellations[reminderKey] = true;
  writePendingSync(sync);
}

function queueClear() {
  writePendingSync({ ...EMPTY_PENDING_SYNC, clear: true });
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Push API request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

async function getExistingPushSubscription() {
  if (!isPushSupported() || Notification.permission !== "granted") {
    return null;
  }

  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

async function getVapidPublicKey() {
  const response = await fetch("/api/push/public-key");
  const data = await readJson<{ publicKey?: unknown }>(response);
  if (typeof data.publicKey !== "string" || data.publicKey.length === 0) {
    throw new Error("Push public key is unavailable");
  }

  return data.publicKey;
}

function decodeBase64Url(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

async function ensureBrowserPushSubscription({ allowPermissionPrompt }: { allowPermissionPrompt: boolean }) {
  if (!isPushSupported()) {
    throw new Error("Push is unsupported");
  }

  let permission = Notification.permission;
  if (permission === "default" && allowPermissionPrompt) {
    if (window.localStorage.getItem(PERMISSION_PROMPT_KEY) === "true") {
      throw new Error("Notification permission prompt already shown");
    }

    window.localStorage.setItem(PERMISSION_PROMPT_KEY, "true");
    permission = await Notification.requestPermission();
  }

  if (permission !== "granted") {
    throw new Error("Notification permission is unavailable");
  }

  const registration = await navigator.serviceWorker.ready;
  const existingSubscription = await registration.pushManager.getSubscription();
  if (existingSubscription) {
    return existingSubscription;
  }

  const publicKey = await getVapidPublicKey();
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: decodeBase64Url(publicKey),
  });
}

async function registerBrowserSubscription(subscription: PushSubscription) {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new Error("Push subscription is incomplete");
  }

  const response = await fetch("/api/push/subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  });
  const data = await readJson<{ subscriptionId?: unknown }>(response);
  if (typeof data.subscriptionId !== "string" || data.subscriptionId.length === 0) {
    throw new Error("Push subscription identifier is unavailable");
  }

  writeBackendSubscriptionId(data.subscriptionId);
  return data.subscriptionId;
}

async function ensureBackendSubscription({ allowPermissionPrompt }: { allowPermissionPrompt: boolean }) {
  const subscription = await ensureBrowserPushSubscription({ allowPermissionPrompt });
  return registerBrowserSubscription(subscription);
}

async function postReminder(subscriptionId: string, reminder: ReleaseReminder) {
  const response = await fetch("/api/release-reminders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscriptionId,
      reminderKey: reminder.id,
      mediaId: Number(reminder.mediaId),
      episode: reminder.episode,
      displayTitle: reminder.displayTitle,
      airingAt: reminder.airingAt,
    }),
  });
  await readJson(response);
}

async function deleteReminder(subscriptionId: string, reminderKey: string) {
  const response = await fetch("/api/release-reminders", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscriptionId, reminderKey }),
  });
  await readJson(response);
}

async function clearRemoteReminders(subscriptionId: string) {
  const response = await fetch("/api/release-reminders/clear", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscriptionId }),
  });
  await readJson(response);
}

export async function syncArmedReminder(reminder: ReleaseReminder) {
  try {
    const subscriptionId = await ensureBackendSubscription({ allowPermissionPrompt: true });
    await postReminder(subscriptionId, reminder);
    const sync = readPendingSync();
    delete sync.registrations[reminder.id];
    writePendingSync(sync);
  } catch (error) {
    queueRegistration(reminder);
    console.warn("Release reminder push sync deferred.", error);
  }
}

export async function syncCancelledReminder(reminderKey: string) {
  const subscriptionId = readBackendSubscriptionId();
  if (!subscriptionId) {
    const sync = readPendingSync();
    delete sync.registrations[reminderKey];
    delete sync.cancellations[reminderKey];
    writePendingSync(sync);
    return;
  }

  try {
    await deleteReminder(subscriptionId, reminderKey);
    const sync = readPendingSync();
    delete sync.cancellations[reminderKey];
    writePendingSync(sync);
  } catch (error) {
    queueCancellation(reminderKey);
    console.warn("Release reminder cancellation deferred.", error);
  }
}

export async function syncClearedReminders() {
  const subscriptionId = readBackendSubscriptionId();
  if (!subscriptionId) {
    writePendingSync({ ...EMPTY_PENDING_SYNC });
    return;
  }

  try {
    await clearRemoteReminders(subscriptionId);
    const sync = readPendingSync();
    sync.clear = false;
    writePendingSync(sync);
  } catch (error) {
    queueClear();
    console.warn("Release reminder clear deferred.", error);
  }
}

export async function reconcileReleaseReminders(reminders: ReleaseReminder[]) {
  if (!isPushSupported() || Notification.permission !== "granted") {
    return;
  }

  try {
    const sync = readPendingSync();
    const nowUnix = Math.floor(Date.now() / 1000);
    const activeReminders = reminders.filter((reminder) => !reminder.notified && reminder.airingAt > nowUnix - 300);
    const activeReminderIds = new Set(activeReminders.map((reminder) => reminder.id));

    for (const reminderKey of Object.keys(sync.registrations)) {
      if (!activeReminderIds.has(reminderKey)) {
        delete sync.registrations[reminderKey];
        sync.cancellations[reminderKey] = true;
      }
    }

    for (const reminder of reminders) {
      if (!activeReminderIds.has(reminder.id)) {
        sync.cancellations[reminder.id] = true;
      }
    }

    let subscriptionId = readBackendSubscriptionId();
    const needsBrowserSubscription =
      activeReminders.length > 0 ||
      Object.keys(sync.registrations).length > 0;
    let subscription = await getExistingPushSubscription();

    if (!subscription && needsBrowserSubscription) {
      subscription = await ensureBrowserPushSubscription({ allowPermissionPrompt: false });
    }

    if (subscription) {
      subscriptionId = await registerBrowserSubscription(subscription);
    }

    if (!subscriptionId) {
      return;
    }

    if (sync.clear) {
      await clearRemoteReminders(subscriptionId);
      sync.clear = false;
    }

    for (const reminder of activeReminders) {
      await postReminder(subscriptionId, reminder);
      delete sync.registrations[reminder.id];
    }

    for (const reminderKey of Object.keys(sync.cancellations)) {
      await deleteReminder(subscriptionId, reminderKey);
      delete sync.cancellations[reminderKey];
    }

    writePendingSync(sync);
  } catch (error) {
    console.warn("Release reminder reconciliation deferred.", error);
  }
}
