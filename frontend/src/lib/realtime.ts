import { createClient, SupabaseClient } from "@supabase/supabase-js";

let realtimeClient: SupabaseClient | null | undefined;

export function getRealtimeClient(): SupabaseClient | null {
  if (realtimeClient !== undefined) {
    return realtimeClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    realtimeClient = null;
    return realtimeClient;
  }

  realtimeClient = createClient(url, anonKey, {
    realtime: {
      params: {
        eventsPerSecond: 15
      }
    }
  });

  return realtimeClient;
}
