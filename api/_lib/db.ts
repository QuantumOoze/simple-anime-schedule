import { neon } from "@neondatabase/serverless";
import { getServerEnv } from "./env";

export function getSql() {
  const databaseUrl = getServerEnv().DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  return neon(databaseUrl);
}
