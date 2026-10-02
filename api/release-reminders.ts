import { getSql } from "./_lib/db";
import { json, methodNotAllowed, readJson, serverConfigurationError } from "./_lib/http";
import { validateReminderIdentity, validateReminderPayload } from "./_lib/validation";

export default async function handler(request: Request) {
  if (request.method === "POST") {
    const reminder = validateReminderPayload(await readJson(request));
    if (!reminder) {
      return json({ error: "Invalid release reminder" }, 400);
    }

    let sql;
    try {
      sql = getSql();
    } catch {
      return serverConfigurationError();
    }

    try {
      const rows = await sql`
        INSERT INTO release_reminders (
          reminder_key, subscription_id, media_id, episode, display_title, airing_at
        )
        SELECT
          ${reminder.reminderKey}, id, ${reminder.mediaId}, ${reminder.episode},
          ${reminder.displayTitle}, ${reminder.airingAt}
        FROM push_subscriptions
        WHERE id = ${reminder.subscriptionId} AND disabled_at IS NULL
        ON CONFLICT (subscription_id, reminder_key) DO UPDATE SET
          media_id = EXCLUDED.media_id,
          episode = EXCLUDED.episode,
          display_title = EXCLUDED.display_title,
          airing_at = EXCLUDED.airing_at,
          cancelled_at = NULL,
          sent_at = NULL,
          claimed_at = NULL
        RETURNING id
      `;

      if (rows.length === 0) {
        return json({ error: "Subscription is not active" }, 404);
      }

      return json({ ok: true });
    } catch {
      return json({ error: "Unable to store release reminder" }, 500);
    }
  }

  if (request.method === "DELETE") {
    const identity = validateReminderIdentity(await readJson(request));
    if (!identity) {
      return json({ error: "Invalid release reminder identity" }, 400);
    }

    let sql;
    try {
      sql = getSql();
    } catch {
      return serverConfigurationError();
    }

    try {
      await sql`
        UPDATE release_reminders
        SET cancelled_at = COALESCE(cancelled_at, NOW()), claimed_at = NULL
        WHERE subscription_id = ${identity.subscriptionId}
          AND reminder_key = ${identity.reminderKey}
      `;
      return json({ ok: true });
    } catch {
      return json({ error: "Unable to cancel release reminder" }, 500);
    }
  }

  return methodNotAllowed(["POST", "DELETE"]);
}
