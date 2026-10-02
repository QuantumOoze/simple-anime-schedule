export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function readJson(request: Request) {
  try {
    return (await request.json()) as unknown;
  } catch {
    return null;
  }
}

export function methodNotAllowed(allowed: string[]) {
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: {
      "allow": allowed.join(", "),
      "content-type": "application/json; charset=utf-8",
    },
  });
}

export function serverConfigurationError() {
  return json({ error: "Backend database is not configured" }, 503);
}
