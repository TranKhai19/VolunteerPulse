import { NextResponse } from "next/server";
import { getAuthenticatedProfile } from "@/lib/supabase";
import { AuthRole, UserProfile } from "@/types/volunteer-pulse";

const ALLOWED_ROLES: AuthRole[] = [
  "pending",
  "volunteer",
  "dtu_unit",
  "commune_youth",
  "coordinator",
  "admin",
];

export async function GET(request: Request) {
  const auth = await getAuthenticatedProfile(request);
  if (!auth) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!auth.profile.approved || !["admin", "coordinator"].includes(auth.profile.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { data, error } = await auth.client
    .from("vp_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const users: UserProfile[] = (data ?? []).map((r) => ({
    id: r.id,
    email: r.email,
    fullName: r.full_name || "",
    role: (r.role as AuthRole) || "pending",
    orgName: r.org_name || "",
    approved: Boolean(r.approved),
    createdAt: r.created_at,
  }));

  return NextResponse.json({ users });
}

export async function PATCH(request: Request) {
  const auth = await getAuthenticatedProfile(request);
  if (!auth) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!auth.profile.approved || !["admin", "coordinator"].includes(auth.profile.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      id: string;
      role: AuthRole;
      approved: boolean;
      orgName?: string;
    };

    if (!body.id || !ALLOWED_ROLES.includes(body.role)) {
      return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
    }

    const { error } = await auth.client
      .from("vp_profiles")
      .update({
        role: body.role,
        approved: Boolean(body.approved),
        org_name: body.orgName ?? "",
      })
      .eq("id", body.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ updated: true });
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
}
