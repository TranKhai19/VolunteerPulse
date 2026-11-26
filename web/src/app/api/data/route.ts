import { NextResponse } from "next/server";
import {
  getAuthenticatedProfile,
  getSupabaseConfig,
  getSupabaseServerClient,
} from "@/lib/supabase";
import {
  AuthRole,
  Campaign,
  DonorTransaction,
  EcosystemOrganization,
  FieldVerificationReport,
  UnitCommitment,
  VillagePoint,
  Volunteer,
} from "@/types/volunteer-pulse";

const DEFAULT_CAMPAIGN: Campaign = {
  id: "camp-xtn-2026",
  name: "Xuân Tình Nguyện Quảng Nam 2026",
  year: 2026,
  province: "Quảng Nam",
  status: "active",
  isDefault: true,
};

const ENTITY_ALLOWED_ROLES: Record<string, AuthRole[]> = {
  campaign: ["admin", "coordinator"],
  organization: ["commune_youth", "dtu_unit", "coordinator", "admin"],
  village: ["commune_youth", "dtu_unit", "coordinator", "admin"],
  commitment: ["dtu_unit", "coordinator", "admin"],
  volunteer: ["dtu_unit", "coordinator", "admin"],
  transaction: ["dtu_unit", "coordinator", "admin"],
  report: ["volunteer", "dtu_unit", "commune_youth", "coordinator", "admin"],
  sync_reports: ["volunteer", "dtu_unit", "commune_youth", "coordinator", "admin"],
  approve_report: ["dtu_unit", "coordinator", "admin"],
  commune_confirm_report: ["commune_youth", "coordinator", "admin"],
};

export async function GET(request: Request) {
  const { isConfigured } = getSupabaseConfig();
  const auth = await getAuthenticatedProfile(request);
  const supabase = auth?.client ?? getSupabaseServerClient();

  if (!isConfigured || !supabase) {
    return NextResponse.json({
      connected: false,
      campaigns: [DEFAULT_CAMPAIGN],
      activeCampaignId: DEFAULT_CAMPAIGN.id,
      currentProfile: null,
      organizations: [],
      villages: [],
      commitments: [],
      volunteers: [],
      reports: [],
      transactions: [],
    });
  }

  const url = new URL(request.url);
  const requestedCampaignId = url.searchParams.get("campaignId") || "";

  // Fetch campaigns (graceful fallback if migration hasn't been run yet)
  const campRes = await supabase
    .from("vp_campaigns")
    .select("*")
    .order("year", { ascending: false })
    .order("created_at", { ascending: false });

  const campaigns: Campaign[] =
    campRes.error || !campRes.data || campRes.data.length === 0
      ? [DEFAULT_CAMPAIGN]
      : campRes.data.map((c) => ({
          id: c.id,
          name: c.name,
          year: Number(c.year || 2026),
          province: c.province || "Quảng Nam",
          status: c.status || "active",
          isDefault: Boolean(c.is_default),
        }));

  const activeCampaignId =
    campaigns.find((c) => c.id === requestedCampaignId)?.id ||
    campaigns.find((c) => c.isDefault)?.id ||
    campaigns[0].id;

  const hasCampaignColumn = !campRes.error;

  const vQuery = supabase.from("vp_villages").select("*").order("created_at", { ascending: false });
  const comQuery = supabase.from("vp_commitments").select("*").order("created_at", { ascending: false });
  const volQuery = supabase.from("vp_volunteers").select("*").order("created_at", { ascending: false });
  const repQuery = supabase.from("vp_field_reports").select("*").order("created_at", { ascending: false });
  const txQuery = supabase.from("vp_transactions").select("*").order("created_at", { ascending: false });

  if (hasCampaignColumn) {
    vQuery.eq("campaign_id", activeCampaignId);
    comQuery.eq("campaign_id", activeCampaignId);
    volQuery.eq("campaign_id", activeCampaignId);
    repQuery.eq("campaign_id", activeCampaignId);
    txQuery.eq("campaign_id", activeCampaignId);
  }

  const [orgRes, vRes, comRes, volRes, repRes, txRes] = await Promise.all([
    supabase.from("vp_organizations").select("*").order("created_at", { ascending: false }),
    vQuery,
    comQuery,
    volQuery,
    repQuery,
    txQuery,
  ]);

  const organizations: EcosystemOrganization[] = (orgRes.data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    orgType: r.org_type,
    district: r.district || "",
    province: r.province || "Quảng Nam",
    leaderName: r.leader_name || "",
    phoneMasked: r.phone_masked || "",
    strengths: r.strengths || [],
  }));

  const villages: VillagePoint[] = (vRes.data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    commune: r.commune || "",
    district: r.district,
    province: r.province || "Quảng Nam",
    lat: Number(r.lat),
    lng: Number(r.lng),
    distanceKm: Number(r.distance_km),
    households: Number(r.households),
    children: Number(r.children),
    difficultyScore: Number(r.difficulty_score),
    priority: r.priority,
    terrainAlerts: r.terrain_alerts || [],
    has4G: Boolean(r.has_4g),
    needs: r.needs || { giftBoxes: 0, warmCoats: 0, medicalKits: 0, riceKg: 0 },
    requiredSkills: r.required_skills || [],
    transportCostPerTrip: Number(r.transport_cost_per_trip || 0),
    verifiedStatus: r.verified_status || "planned",
    notes: r.notes || "",
    communeOrgId: r.commune_org_id || "",
    communeOrgName: r.commune_org_name || "",
    communeLeader: r.commune_leader || "",
    coverageStatus: r.coverage_status || "unclaimed",
  }));

  const commitments: UnitCommitment[] = (comRes.data ?? []).map((r) => ({
    id: r.id,
    villageId: r.village_id,
    dtuOrgId: r.dtu_org_id || "",
    dtuOrgName: r.dtu_org_name,
    commitmentType: r.commitment_type || "full",
    pledgedBudgetVnd: Number(r.pledged_budget_vnd || 0),
    pledgedSkills: r.pledged_skills || [],
    status: r.status || "active",
    note: r.note || "",
  }));

  const volunteers: Volunteer[] = (volRes.data ?? []).map((r) => ({
    id: r.id,
    fullName: r.full_name,
    studentId: r.student_id || "",
    faculty: r.faculty || "",
    phoneMasked: r.phone_masked || "",
    skills: r.skills || [],
    highlandTrips: Number(r.highland_trips || 0),
    availability: r.availability || "",
    bio: r.bio || "",
    hasDrivingLicense: Boolean(r.has_driving_license),
  }));

  const reports: FieldVerificationReport[] = (repRes.data ?? []).map((r) => ({
    id: r.id,
    villageId: r.village_id || "",
    villageName: r.village_name,
    volunteerName: r.volunteer_name,
    dtuOrgName: r.dtu_org_name || "",
    timestamp: r.timestamp_label,
    lat: Number(r.lat),
    lng: Number(r.lng),
    gpsAccuracyMeters: Number(r.gps_accuracy_meters || 5),
    exifVerified: Boolean(r.exif_verified),
    syncStatus: r.sync_status || "synced",
    leaderApproved: Boolean(r.leader_approved),
    communeConfirmed: Boolean(r.commune_confirmed),
    communeConfirmNote: r.commune_confirm_note || "",
    communeConfirmedAt: r.commune_confirmed_at || "",
    imageUrl: r.image_url || undefined,
    gpsSource: r.gps_source || "device_gps",
    campaignId: r.campaign_id || activeCampaignId,
    photoType: r.photo_type || "delivery",
    sampleScene: "tra_linh_gifts",
    yoloSummary: r.yolo_summary || {
      detectedCount: 0,
      expectedCount: 0,
      itemLabel: "",
      avgConfidence: 0,
      boxes: [],
    },
    ocrSummary: r.ocr_summary || undefined,
    geminiAuditNote: r.gemini_audit_note || "",
  }));

  const transactions: DonorTransaction[] = (txRes.data ?? []).map((r) => ({
    id: r.id,
    donorName: r.donor_name,
    type: r.type,
    amountVnd: Number(r.amount_vnd),
    date: r.date_label,
    villageName: r.village_name || undefined,
    description: r.description,
    verifiedReceiptId: r.verified_receipt_id || undefined,
  }));

  return NextResponse.json({
    connected: true,
    campaigns,
    activeCampaignId,
    currentProfile: auth?.profile ?? null,
    organizations,
    villages,
    commitments,
    volunteers,
    reports,
    transactions,
  });
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedProfile(request);
  if (!auth) {
    return NextResponse.json(
      { saved: false, error: "Vui lòng đăng nhập để thực hiện thao tác này." },
      { status: 401 }
    );
  }

  if (!auth.profile.approved) {
    return NextResponse.json(
      {
        saved: false,
        error: "Tài khoản của bạn đang chờ Admin Đoàn trường phê duyệt phân quyền.",
      },
      { status: 403 }
    );
  }

  const supabase = auth.client;

  try {
    const body = (await request.json()) as {
      entity: string;
      campaignId?: string;
      payload?: unknown;
    };

    const allowedRoles = ENTITY_ALLOWED_ROLES[body.entity];
    if (!allowedRoles) {
      return NextResponse.json({ saved: false, error: "UNKNOWN_ENTITY" }, { status: 400 });
    }
    if (!allowedRoles.includes(auth.profile.role)) {
      return NextResponse.json(
        {
          saved: false,
          error: `Vai trò "${auth.profile.role}" không có quyền thực hiện thao tác "${body.entity}".`,
        },
        { status: 403 }
      );
    }

    const campaignId = body.campaignId || DEFAULT_CAMPAIGN.id;

    if (body.entity === "campaign") {
      const c = body.payload as Campaign;
      const { error } = await supabase.from("vp_campaigns").insert({
        id: c.id,
        name: c.name,
        year: c.year,
        province: c.province,
        status: c.status || "active",
        is_default: Boolean(c.isDefault),
      });
      if (error) throw error;
      return NextResponse.json({ saved: true });
    }

    if (body.entity === "organization") {
      const org = body.payload as EcosystemOrganization;
      const { error } = await supabase.from("vp_organizations").insert({
        id: org.id,
        name: org.name,
        org_type: org.orgType,
        district: org.district,
        province: org.province,
        leader_name: org.leaderName,
        phone_masked: org.phoneMasked,
        strengths: org.strengths,
      });
      if (error) throw error;
      return NextResponse.json({ saved: true });
    }

    if (body.entity === "village") {
      const v = body.payload as VillagePoint;
      const { error } = await supabase.from("vp_villages").insert({
        id: v.id,
        name: v.name,
        commune: v.commune,
        district: v.district,
        province: v.province,
        lat: v.lat,
        lng: v.lng,
        location: `SRID=4326;POINT(${v.lng} ${v.lat})`,
        distance_km: v.distanceKm,
        households: v.households,
        children: v.children,
        difficulty_score: v.difficultyScore,
        priority: v.priority,
        terrain_alerts: v.terrainAlerts,
        has_4g: v.has4G,
        needs: v.needs,
        required_skills: v.requiredSkills,
        transport_cost_per_trip: v.transportCostPerTrip,
        verified_status: v.verifiedStatus,
        notes: v.notes,
        commune_org_id: v.communeOrgId || "",
        commune_org_name: v.communeOrgName || "",
        commune_leader: v.communeLeader || "",
        coverage_status: v.coverageStatus || "unclaimed",
        campaign_id: campaignId,
      });
      if (error) throw error;
      return NextResponse.json({ saved: true });
    }

    if (body.entity === "commitment") {
      const c = body.payload as UnitCommitment & { nextCoverageStatus?: string };
      const { error } = await supabase.from("vp_commitments").insert({
        id: c.id,
        village_id: c.villageId,
        dtu_org_id: c.dtuOrgId,
        dtu_org_name: c.dtuOrgName,
        commitment_type: c.commitmentType,
        pledged_budget_vnd: c.pledgedBudgetVnd,
        pledged_skills: c.pledgedSkills,
        status: c.status,
        note: c.note,
        campaign_id: campaignId,
      });
      if (error) throw error;
      if (c.nextCoverageStatus) {
        await supabase
          .from("vp_villages")
          .update({ coverage_status: c.nextCoverageStatus })
          .eq("id", c.villageId);
      }
      return NextResponse.json({ saved: true });
    }

    if (body.entity === "volunteer") {
      const vol = body.payload as Volunteer;
      const { error } = await supabase.from("vp_volunteers").insert({
        id: vol.id,
        full_name: vol.fullName,
        student_id: vol.studentId,
        faculty: vol.faculty,
        phone_masked: vol.phoneMasked,
        skills: vol.skills,
        highland_trips: vol.highlandTrips,
        availability: vol.availability,
        bio: vol.bio,
        has_driving_license: vol.hasDrivingLicense,
        campaign_id: campaignId,
      });
      if (error) throw error;
      return NextResponse.json({ saved: true });
    }

    if (body.entity === "report") {
      const r = body.payload as FieldVerificationReport;
      const { error } = await supabase.from("vp_field_reports").insert({
        id: r.id,
        village_id: r.villageId || null,
        village_name: r.villageName,
        volunteer_name: r.volunteerName,
        dtu_org_name: r.dtuOrgName || "",
        timestamp_label: r.timestamp,
        lat: r.lat,
        lng: r.lng,
        location: `SRID=4326;POINT(${r.lng} ${r.lat})`,
        gps_accuracy_meters: r.gpsAccuracyMeters,
        exif_verified: r.exifVerified,
        sync_status: r.syncStatus,
        leader_approved: r.leaderApproved,
        commune_confirmed: Boolean(r.communeConfirmed),
        commune_confirm_note: r.communeConfirmNote || "",
        commune_confirmed_at: r.communeConfirmedAt || "",
        image_url: r.imageUrl ?? null,
        gps_source: r.gpsSource || "device_gps",
        campaign_id: campaignId,
        photo_type: r.photoType,
        yolo_summary: r.yoloSummary,
        ocr_summary: r.ocrSummary ?? null,
        gemini_audit_note: r.geminiAuditNote,
      });
      if (error) throw error;
      return NextResponse.json({ saved: true });
    }

    if (body.entity === "transaction") {
      const t = body.payload as DonorTransaction;
      const { error } = await supabase.from("vp_transactions").insert({
        id: t.id,
        donor_name: t.donorName,
        type: t.type,
        amount_vnd: t.amountVnd,
        date_label: t.date,
        village_name: t.villageName ?? null,
        description: t.description,
        verified_receipt_id: t.verifiedReceiptId ?? null,
        campaign_id: campaignId,
      });
      if (error) throw error;
      return NextResponse.json({ saved: true });
    }

    if (body.entity === "approve_report") {
      const { id } = body.payload as { id: string };
      const { error } = await supabase
        .from("vp_field_reports")
        .update({ leader_approved: true })
        .eq("id", id);
      if (error) throw error;
      return NextResponse.json({ saved: true });
    }

    if (body.entity === "commune_confirm_report") {
      const { id, note, confirmedAt, villageId } = body.payload as {
        id: string;
        note: string;
        confirmedAt: string;
        villageId?: string;
      };
      const { error } = await supabase
        .from("vp_field_reports")
        .update({
          commune_confirmed: true,
          commune_confirm_note: note,
          commune_confirmed_at: confirmedAt,
        })
        .eq("id", id);
      if (error) throw error;
      if (villageId) {
        await supabase
          .from("vp_villages")
          .update({ coverage_status: "completed", verified_status: "verified" })
          .eq("id", villageId);
      }
      return NextResponse.json({ saved: true });
    }

    if (body.entity === "sync_reports") {
      const reports = body.payload as FieldVerificationReport[];
      for (const r of reports) {
        const { error } = await supabase.from("vp_field_reports").upsert({
          id: r.id,
          village_id: r.villageId || null,
          village_name: r.villageName,
          volunteer_name: r.volunteerName,
          dtu_org_name: r.dtuOrgName || "",
          timestamp_label: r.timestamp,
          lat: r.lat,
          lng: r.lng,
          location: `SRID=4326;POINT(${r.lng} ${r.lat})`,
          gps_accuracy_meters: r.gpsAccuracyMeters,
          exif_verified: r.exifVerified,
          sync_status: "synced",
          leader_approved: r.leaderApproved,
          commune_confirmed: Boolean(r.communeConfirmed),
          commune_confirm_note: r.communeConfirmNote || "",
          commune_confirmed_at: r.communeConfirmedAt || "",
          image_url: r.imageUrl ?? null,
          gps_source: r.gpsSource || "device_gps",
          campaign_id: campaignId,
          photo_type: r.photoType,
          yolo_summary: r.yoloSummary,
          ocr_summary: r.ocrSummary ?? null,
          gemini_audit_note: r.geminiAuditNote,
        });
        if (error) throw error;
      }
      return NextResponse.json({ saved: true });
    }

    return NextResponse.json({ saved: false, error: "UNKNOWN_ENTITY" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { saved: false, error: err instanceof Error ? err.message : "DB_ERROR" },
      { status: 500 }
    );
  }
}

const SOFT_DELETE_TABLES: Record<string, { table: string; roles: AuthRole[] }> = {
  village: { table: "vp_villages", roles: ["commune_youth", "coordinator", "admin"] },
  commitment: { table: "vp_commitments", roles: ["dtu_unit", "coordinator", "admin"] },
  volunteer: { table: "vp_volunteers", roles: ["dtu_unit", "coordinator", "admin"] },
  report: { table: "vp_field_reports", roles: ["coordinator", "admin"] },
  transaction: { table: "vp_transactions", roles: ["coordinator", "admin"] },
};

export async function DELETE(request: Request) {
  const auth = await getAuthenticatedProfile(request);
  if (!auth) {
    return NextResponse.json(
      { deleted: false, error: "Vui lòng đăng nhập để thực hiện thao tác xóa." },
      { status: 401 }
    );
  }
  if (!auth.profile.approved) {
    return NextResponse.json(
      { deleted: false, error: "Tài khoản chưa được phê duyệt." },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as { entity: string; id: string; reason?: string };
    const cfg = SOFT_DELETE_TABLES[body.entity];
    if (!cfg || !body.id) {
      return NextResponse.json({ deleted: false, error: "INVALID_REQUEST" }, { status: 400 });
    }
    if (!cfg.roles.includes(auth.profile.role)) {
      return NextResponse.json(
        { deleted: false, error: `Vai trò "${auth.profile.role}" không có quyền xóa mục này.` },
        { status: 403 }
      );
    }

    const { error } = await auth.client
      .from(cfg.table)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", body.id);
    if (error) throw error;

    // Best-effort audit log (ignore if migration 002 hasn't been applied yet)
    await auth.client.from("vp_audit_logs").insert({
      actor_id: auth.userId,
      actor_email: auth.email,
      actor_role: auth.profile.role,
      action: "soft_delete",
      entity: body.entity,
      entity_id: body.id,
      details: { reason: body.reason || "" },
    });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    return NextResponse.json(
      { deleted: false, error: err instanceof Error ? err.message : "DELETE_ERROR" },
      { status: 500 }
    );
  }
}
