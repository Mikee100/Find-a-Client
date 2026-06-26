import { createClient, SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null | undefined;

function getBrowserClient(): SupabaseClient | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (browserClient !== undefined) {
    return browserClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    browserClient = null;
    return null;
  }

  browserClient = createClient(url, anonKey);
  return browserClient;
}

export async function syncSupabaseBrowserSession(tokens: {
  accessToken?: string | null;
  refreshToken?: string | null;
}): Promise<void> {
  const accessToken = tokens.accessToken?.trim();
  const refreshToken = tokens.refreshToken?.trim();

  if (!accessToken || !refreshToken) {
    return;
  }

  const client = getBrowserClient();
  if (!client) {
    return;
  }

  await client.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken
  });
}
