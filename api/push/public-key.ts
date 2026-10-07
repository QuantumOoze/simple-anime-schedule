import { getServerEnv } from "../_lib/env";
import { json, methodNotAllowed, serverConfigurationError } from "../_lib/http";

export default function handler(request: Request) {
  if (request.method !== "GET") {
    return methodNotAllowed(["GET"]);
  }

  const publicKey = getServerEnv().VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return serverConfigurationError();
  }

  return json({ publicKey });
}
