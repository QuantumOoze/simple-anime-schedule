const MAX_ENDPOINT_LENGTH = 2048;
const MAX_KEY_LENGTH = 512;
const MAX_TITLE_LENGTH = 240;
const MAX_REMINDER_AGE_SECONDS = 60 * 5;
const MAX_REMINDER_HORIZON_SECONDS = 366 * 24 * 60 * 60;

export function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export function requiredString(value: unknown, maxLength: number) {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength ? value : null;
}

export function requiredUuid(value: unknown) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

export function positiveInteger(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function validateSubscriptionPayload(value: unknown) {
  const body = asObject(value);
  if (!body) {
    return null;
  }

  const endpoint = requiredString(body.endpoint, MAX_ENDPOINT_LENGTH);
  const keys = asObject(body.keys);
  const p256dh = keys ? requiredString(keys.p256dh, MAX_KEY_LENGTH) : null;
  const auth = keys ? requiredString(keys.auth, MAX_KEY_LENGTH) : null;

  return endpoint && p256dh && auth ? { endpoint, p256dh, auth } : null;
}

export function validateReminderPayload(value: unknown) {
  const body = asObject(value);
  if (!body) {
    return null;
  }

  const subscriptionId = requiredUuid(body.subscriptionId);
  const reminderKey = requiredString(body.reminderKey, MAX_KEY_LENGTH);
  const mediaId = positiveInteger(body.mediaId);
  const episode = positiveInteger(body.episode);
  const displayTitle = requiredString(body.displayTitle, MAX_TITLE_LENGTH);
  const airingAt = positiveInteger(body.airingAt);

  if (!subscriptionId || !reminderKey || !mediaId || !episode || !displayTitle || !airingAt) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const canonicalKey = `anilist:${mediaId}:${episode}:${airingAt}`;
  if (reminderKey !== canonicalKey || airingAt <= now - MAX_REMINDER_AGE_SECONDS || airingAt > now + MAX_REMINDER_HORIZON_SECONDS) {
    return null;
  }

  return { subscriptionId, reminderKey, mediaId, episode, displayTitle, airingAt };
}

export function validateReminderIdentity(value: unknown) {
  const body = asObject(value);
  if (!body) {
    return null;
  }

  const subscriptionId = requiredUuid(body.subscriptionId);
  const reminderKey = requiredString(body.reminderKey, MAX_KEY_LENGTH);
  return subscriptionId && reminderKey ? { subscriptionId, reminderKey } : null;
}
