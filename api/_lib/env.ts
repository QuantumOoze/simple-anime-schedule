type ServerProcess = { env?: Record<string, string | undefined> };

export function getServerEnv() {
  return (globalThis as typeof globalThis & { process?: ServerProcess }).process?.env ?? {};
}
