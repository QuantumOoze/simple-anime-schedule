import { getSql } from "../_lib/db";
import { json, methodNotAllowed, readJson, serverConfigurationError } from "../_lib/http";
import { asObject, requiredUuid, validateSubscriptionPayload } from "../_lib/validation";

export default async function handler(request: Request) {
  if (request.method === "POST") {
    const subscription = validateSubscriptionPayload(await readJson(request));
    if (!subscription) {
      return json({ error: "Invalid push subscription" }, 400);
    }

    let sql;
    try {
      sql = getSql();
    } catch {
      return serverConfigurationError();
    }

    try {
      const rows = await sql`
        INSERT INTO push_subscriptions (endpoint, p256dh, auth)
        VALUES (${subscription.endpoint}, ${subscription.p256dh}, ${subscription.auth})
        ON CONFLICT (endpoint) DO UPDATE SET
          p256dh = EXCLUDED.p256dh,
          auth = EXCLUDED.auth,
          updated_at = NOW(),
          last_seen_at = NOW(),
          disabled_at = NULL
        RETURNING id
      `;
      return json({ subscriptionId: rows[0].id });
    } catch {
      return json({ error: "Unable to store push subscription" }, 500);
    }
  }

  if (request.method === "DELETE") {
    const body = asObject(await readJson(request));
    const subscriptionId = requiredUuid(body?.subscriptionId);
    if (!subscriptionId) {
      return json({ error: "Invalid subscription identifier" }, 400);
    }

    let sql;
    try {
      sql = getSql();
    } catch {
      return serverConfigurationError();
    }

    try {
      await sql`
        UPDATE push_subscriptions
        SET disabled_at = COALESCE(disabled_at, NOW()), updated_at = NOW()
        WHERE id = ${subscriptionId}
      `;
      return json({ ok: true });
    } catch {
      return json({ error: "Unable to disable push subscription" }, 500);
    }
  }

  return methodNotAllowed(["POST", "DELETE"]);
}
