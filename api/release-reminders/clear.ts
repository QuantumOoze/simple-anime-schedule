import { getSql } from "../_lib/db";
import { json, methodNotAllowed, readJson, serverConfigurationError } from "../_lib/http";
import { asObject, requiredUuid } from "../_lib/validation";

export default async function handler(request: Request) {
  if (request.method !== "DELETE") {
    return methodNotAllowed(["DELETE"]);
  }

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
      UPDATE release_reminders
      SET cancelled_at = COALESCE(cancelled_at, NOW()), claimed_at = NULL
      WHERE subscription_id = ${subscriptionId} AND cancelled_at IS NULL
    `;
    return json({ ok: true });
  } catch {
    return json({ error: "Unable to clear release reminders" }, 500);
  }
}
