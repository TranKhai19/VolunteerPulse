import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { AuthRole, UserProfile } from "@/types/volunteer-pulse";

let cachedAnonServerClient: SupabaseClient | null = null;
let cachedBrowserClient: SupabaseClient | null = null;

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  return {
    url,
    anonKey,
    serviceKey,
    isConfigured: url.startsWith("https://") && anonKey.length > 15,
  };
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;
  if (!cachedBrowserClient) {
    cachedBrowserClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return cachedBrowserClient;
}

export function getSupabaseServerClient(accessToken?: string): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;

  if (accessToken) {
    return createClient(url, anonKey, {
      auth: { persistSession: false },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });
  }

  if (!cachedAnonServerClient) {
    cachedAnonServerClient = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
  }
  return cachedAnonServerClient;
}

export function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  return token.length > 10 ? token : null;
}

export async function getAuthenticatedProfile(request: Request): Promise<{
  token: string;
  userId: string;
  email: string;
  profile: UserProfile;
  client: SupabaseClient;
} | null> {
  const token = extractBearerToken(request);
  if (!token) return null;

  const client = getSupabaseServerClient(token);
  if (!client) return null;

  const { data: userData, error: userErr } = await client.auth.getUser(token);
  if (userErr || !userData?.user) return null;

  const { data: profileRow } = await client
    .from("vp_profiles")
    .select("*")
    .eq("id", userData.user.id)
    .maybeSingle();

  const profile: UserProfile = profileRow
    ? {
        id: profileRow.id,
        email: profileRow.email || userData.user.email || "",
        fullName: profileRow.full_name || "",
        role: (profileRow.role as AuthRole) || "pending",
        orgName: profileRow.org_name || "",
        approved: Boolean(profileRow.approved),
        createdAt: profileRow.created_at,
      }
    : {
        id: userData.user.id,
        email: userData.user.email || "",
        fullName: (userData.user.user_metadata?.full_name as string) || "",
        role: "pending",
        orgName: "",
        approved: false,
      };

  return {
    token,
    userId: userData.user.id,
    email: userData.user.email || "",
    profile,
    client,
  };
}
