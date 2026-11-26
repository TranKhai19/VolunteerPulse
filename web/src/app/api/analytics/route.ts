import { NextResponse } from "next/server";
import { getSupabaseConfig, getSupabaseServerClient } from "@/lib/supabase";

export interface CampaignAnalyticsRow {
  campaignId: string;
  campaignName: string;
  year: number;
  province: string;
  status: string;
  villagesCount: number;
  verifiedVillagesCount: number;
  householdsReached: number;
  childrenReached: number;
  totalInflowVnd: number;
  totalOutflowVnd: number;
  reportsCount: number;
  confirmedReportsCount: number;
}

export async function GET() {
  const { isConfigured } = getSupabaseConfig();
  const supabase = getSupabaseServerClient();

  if (!isConfigured || !supabase) {
    return NextResponse.json({ connected: false, rows: [] });
  }

  const [campRes, vRes, txRes, repRes] = await Promise.all([
    supabase.from("vp_campaigns").select("*").order("year", { ascending: true }),
    supabase.from("vp_villages").select("id, campaign_id, households, children, verified_status, coverage_status"),
    supabase.from("vp_transactions").select("id, campaign_id, type, amount_vnd"),
    supabase.from("vp_field_reports").select("id, campaign_id, commune_confirmed, leader_approved"),
  ]);

  const campaigns =
    campRes.error || !campRes.data || campRes.data.length === 0
      ? [
          {
            id: "camp-xtn-2026",
            name: "Xuân Tình Nguyện Quảng Nam 2026",
            year: 2026,
            province: "Quảng Nam",
            status: "active",
          },
        ]
      : campRes.data;

  const villages = vRes.data ?? [];
  const txs = txRes.data ?? [];
  const reps = repRes.data ?? [];

  const rows: CampaignAnalyticsRow[] = campaigns.map((c) => {
    const cVillages = villages.filter((v) => (v.campaign_id || "camp-xtn-2026") === c.id);
    const cTxs = txs.filter((t) => (t.campaign_id || "camp-xtn-2026") === c.id);
    const cReps = reps.filter((r) => (r.campaign_id || "camp-xtn-2026") === c.id);

    const verifiedVillages = cVillages.filter(
      (v) => v.verified_status === "verified" || v.coverage_status === "completed"
    );

    return {
      campaignId: c.id,
      campaignName: c.name,
      year: Number(c.year || 2026),
      province: c.province || "Quảng Nam",
      status: c.status || "active",
      villagesCount: cVillages.length,
      verifiedVillagesCount: verifiedVillages.length,
      householdsReached: cVillages.reduce((s, v) => s + Number(v.households || 0), 0),
      childrenReached: cVillages.reduce((s, v) => s + Number(v.children || 0), 0),
      totalInflowVnd: cTxs
        .filter((t) => t.type === "inflow")
        .reduce((s, t) => s + Number(t.amount_vnd || 0), 0),
      totalOutflowVnd: cTxs
        .filter((t) => t.type === "outflow")
        .reduce((s, t) => s + Number(t.amount_vnd || 0), 0),
      reportsCount: cReps.length,
      confirmedReportsCount: cReps.filter((r) => Boolean(r.commune_confirmed)).length,
    };
  });

  return NextResponse.json({ connected: true, rows });
}
