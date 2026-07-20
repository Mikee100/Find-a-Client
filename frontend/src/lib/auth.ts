export type AppRole = "DEVELOPER" | "CLIENT" | "ADMIN";

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  if (!token) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getRoleFromAccessToken(accessToken: string): AppRole | null {
  const payload = decodeJwtPayload(accessToken);
  if (!payload) {
    return null;
  }

  const role = payload.role;
  if (role === "DEVELOPER" || role === "CLIENT" || role === "ADMIN") {
    return role;
  }

  return null;
}
