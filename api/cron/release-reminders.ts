import { getSql } from "../_lib/db";
import { getServerEnv } from "../_lib/env";
import { json, methodNotAllowed, serverConfigurationError } from "../_lib/http";
import {
  classifyPushError,
  sendReleaseReminder,
  type ReleaseReminderPayload,
} from "../_lib/webPush";

const CLAIM_BATCH_SIZE = 50;
const CLAIM_EXPIRY_MINUTES = 5;

type ClaimedReminderId = { id: string };
type ClaimedReminder = {
  id: string;
  reminder_key: string;
  media_id: number;
  episode: number;
  display_title: string;
  airing_at: number;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export default async function handler(request: Request) {
  if (request.method !== "GET") {
    return methodNotAllowed(["GET"]);
  }

  const expectedSecret = getServerEnv().CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!expectedSecret || authorization !== `Bearer ${expectedSecret}`) {
    return json({ error: "Unauthorized" }, 401);
  }

  let sql;
  try {
    sql = getSql();
    if (!getServerEnv().VAPID_SUBJECT || !getServerEnv().VAPID_PUBLIC_KEY || !getServerEnv().VAPID_PRIVATE_KEY) {
      throw new Error("VAPID configuration is incomplete");
    }
  } catch {
    return serverConfigurationError();
  }

  try {
    const claimedIds = (await sql`
      WITH candidates AS (
        SELECT rr.id
        FROM release_reminders rr
        JOIN push_subscriptions ps ON ps.id = rr.subscription_id
        WHERE rr.cancelled_at IS NULL
          AND rr.sent_at IS NULL
          AND ps.disabled_at IS NULL
          AND rr.airing_at <= FLOOR(EXTRACT(EPOCH FROM NOW()))
          AND (
            rr.claimed_at IS NULL
            OR rr.claimed_at < NOW() - (${CLAIM_EXPIRY_MINUTES} * INTERVAL '1 minute')
          )
        ORDER BY rr.airing_at ASC, rr.id ASC
        LIMIT ${CLAIM_BATCH_SIZE}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE release_reminders rr
      SET claimed_at = NOW()
      FROM candidates
      WHERE rr.id = candidates.id
      RETURNING rr.id
    `) as ClaimedReminderId[];

    if (claimedIds.length === 0) {
      return json({ success: true, claimed: 0, sent: 0, transientFailures: 0, invalidSubscriptions: 0 });
    }

    const reminderIds = claimedIds.map(({ id }) => id);
    const reminders = (await sql`
      SELECT rr.id, rr.reminder_key, rr.media_id::int, rr.episode, rr.display_title, rr.airing_at::bigint,
             ps.endpoint, ps.p256dh, ps.auth
      FROM release_reminders rr
      JOIN push_subscriptions ps ON ps.id = rr.subscription_id
      WHERE rr.id = ANY(${reminderIds}::uuid[])
        AND rr.cancelled_at IS NULL
        AND rr.sent_at IS NULL
        AND rr.claimed_at IS NOT NULL
        AND ps.disabled_at IS NULL
    `) as ClaimedReminder[];

    let sent = 0;
    let transientFailures = 0;
    let invalidSubscriptions = 0;

    for (const reminder of reminders) {
      const payload: ReleaseReminderPayload = {
        type: "release-reminder",
        reminderKey: reminder.reminder_key,
        mediaId: reminder.media_id,
        episode: reminder.episode,
        displayTitle: reminder.display_title,
        airingAt: Number(reminder.airing_at),
        title: "Anime release reminder",
        body: `${reminder.display_title} — EP ${reminder.episode} is airing now`,
      };

      try {
        await sendReleaseReminder(reminder, payload);
        await sql`
          UPDATE release_reminders
          SET sent_at = NOW(), claimed_at = NULL
          WHERE id = ${reminder.id}
            AND claimed_at IS NOT NULL
            AND sent_at IS NULL
        `;
        sent += 1;
      } catch (error) {
        if (classifyPushError(error) === "permanent") {
          await sql`
            UPDATE push_subscriptions
            SET disabled_at = NOW(), updated_at = NOW()
            WHERE endpoint = ${reminder.endpoint}
          `;
          await sql`
            UPDATE release_reminders rr
            SET cancelled_at = NOW(), claimed_at = NULL
            FROM push_subscriptions ps
            WHERE rr.subscription_id = ps.id
              AND ps.endpoint = ${reminder.endpoint}
              AND rr.sent_at IS NULL
              AND rr.cancelled_at IS NULL
          `;
          invalidSubscriptions += 1;
        } else {
          await sql`
            UPDATE release_reminders
            SET claimed_at = NULL
            WHERE id = ${reminder.id}
              AND sent_at IS NULL
          `;
          transientFailures += 1;
        }
      }
    }

    const fetchedIds = new Set(reminders.map(({ id }) => id));
    for (const { id } of claimedIds) {
      if (!fetchedIds.has(id)) {
        await sql`
          UPDATE release_reminders
          SET claimed_at = NULL
          WHERE id = ${id}
            AND sent_at IS NULL
        `;
      }
    }

    return json({
      success: true,
      claimed: claimedIds.length,
      sent,
      transientFailures,
      invalidSubscriptions,
    });
  } catch {
    return json({ error: "Unable to deliver release reminders" }, 500);
  }
}
