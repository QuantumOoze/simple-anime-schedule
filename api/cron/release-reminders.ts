import { getSql } from "../_lib/db";
import { getServerEnv } from "../_lib/env";
import { json, methodNotAllowed, serverConfigurationError } from "../_lib/http";

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
  } catch {
    return serverConfigurationError();
  }

  try {
    const rows = await sql`
      SELECT COUNT(*)::int AS count
      FROM release_reminders
      WHERE cancelled_at IS NULL
        AND sent_at IS NULL
        AND airing_at <= FLOOR(EXTRACT(EPOCH FROM NOW()))
    `;
    return json({ ok: true, dueCount: rows[0]?.count ?? 0 });
  } catch {
    return json({ error: "Unable to inspect due reminders" }, 500);
  }
}
