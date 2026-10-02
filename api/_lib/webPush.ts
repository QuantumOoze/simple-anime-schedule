import webpush from "web-push";
import { getServerEnv } from "./env";

export type ReleaseReminderPayload = {
  type: "release-reminder";
  reminderKey: string;
  mediaId: number;
  episode: number;
  displayTitle: string;
  airingAt: number;
  title: string;
  body: string;
};

type StoredSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

let configured = false;

function configureWebPush() {
  if (configured) {
    return;
  }

  const env = getServerEnv();
  const subject = env.VAPID_SUBJECT;
  const publicKey = env.VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;

  if (!subject || !publicKey || !privateKey) {
    throw new Error("VAPID configuration is incomplete");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export function classifyPushError(error: unknown): "permanent" | "transient" {
  const statusCode =
    typeof error === "object" && error !== null && "statusCode" in error
      ? (error as { statusCode?: unknown }).statusCode
      : undefined;

  return statusCode === 404 || statusCode === 410 ? "permanent" : "transient";
}

export async function sendReleaseReminder(
  subscription: StoredSubscription,
  payload: ReleaseReminderPayload,
) {
  configureWebPush();
  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    },
    JSON.stringify(payload),
  );
}
