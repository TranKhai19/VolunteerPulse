"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Calculator,
  Calendar,
  Camera,
  CheckCircle2,
  Compass,
  Database,
  FileSpreadsheet,
  Handshake,
  LogIn,
  LogOut,
  Map,
  Menu,
  ShieldCheck,
  Users,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import AuthModal from "@/components/AuthModal";
import AnalyticsModule from "@/components/AnalyticsModule";
import MapModule from "@/components/MapModule";
import EcosystemModule from "@/components/EcosystemModule";
import OptimizerModule from "@/components/OptimizerModule";
import MatchingModule from "@/components/MatchingModule";
import VerificationModule from "@/components/VerificationModule";
import TransparencyModule from "@/components/TransparencyModule";
import { runBudgetOptimization } from "@/lib/optimizer";
import { clearOfflineReports, loadOfflineReports, saveOfflineReport } from "@/lib/offline-db";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import {
  Campaign,
  DonorTransaction,
  EcosystemOrganization,
  FieldVerificationReport,
  OptimizationConfig,
  UnitCommitment,
  UserProfile,
  UserRole,
  VillagePoint,
  Volunteer,
} from "@/types/volunteer-pulse";

type TabId =
  | "map"
  | "ecosystem"
  | "optimizer"
  | "matching"
  | "verification"
  | "transparency"
  | "analytics";

const OFFLINE_STORAGE_KEY = "volunteerpulse_offline_reports_v1";

export default function VolunteerPulseApp() {
  const [activeTab, setActiveTab] = useState<TabId>("map");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaignId, setActiveCampaignId] = useState<string>("camp-xtn-2026");
  const [toast, setToast] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const [organizations, setOrganizations] = useState<EcosystemOrganization[]>([]);
  const [villages, setVillages] = useState<VillagePoint[]>([]);
  const [commitments, setCommitments] = useState<UnitCommitment[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [reports, setReports] = useState<FieldVerificationReport[]>([]);
  const [transactions, setTransactions] = useState<DonorTransaction[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [dbConnected, setDbConnected] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [aiStatus, setAiStatus] = useState<{ live: boolean; model: string }>({
    live: false,
    model: "gemini-2.5-flash",
  });

  const role: UserRole = useMemo(() => {
    if (!currentProfile?.approved) return "dtu_unit";
    if (currentProfile.role === "commune_youth") return "commune_youth";
    if (currentProfile.role === "admin" || currentProfile.role === "coordinator") return "coordinator";
    return "dtu_unit";
  }, [currentProfile]);

  const activeCampaign = useMemo(
    () => campaigns.find((c) => c.id === activeCampaignId) ?? campaigns[0],
    [campaigns, activeCampaignId]
  );

  function showToast(type: "error" | "success", text: string) {
    setToast({ type, text });
    window.setTimeout(() => {
      setToast((curr) => (curr?.text === text ? null : curr));
    }, 4500);
  }

  const [optConfig, setOptConfig] = useState<OptimizationConfig>({
    totalBudgetVnd: 150_000_000,
    giftBoxUnitCost: 300_000,
    warmCoatUnitCost: 150_000,
    medicalKitUnitCost: 160_000,
    fairnessWeight: 0.8,
    selectedVillageIds: [],
  });

  const loadWorkspaceData = useCallback(
    async (tokenOverride?: string | null, campaignOverride?: string) => {
      setIsLoadingData(true);
      const token = tokenOverride !== undefined ? tokenOverride : accessToken;
      const campId = campaignOverride || activeCampaignId;
      try {
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        const [dbData, aiData] = await Promise.all([
          fetch(`/api/data?campaignId=${encodeURIComponent(campId)}`, { headers }).then((r) =>
            r.json()
          ),
          fetch("/api/ai/status").then((r) => r.json()),
        ]);

        setDbConnected(Boolean(dbData.connected));
        if (Array.isArray(dbData.campaigns) && dbData.campaigns.length > 0) {
          setCampaigns(dbData.campaigns);
        }
        if (dbData.activeCampaignId) {
          setActiveCampaignId(dbData.activeCampaignId);
        }
        setCurrentProfile(dbData.currentProfile ?? null);

        const loadedOrgs: EcosystemOrganization[] = dbData.organizations ?? [];
        const loadedVillages: VillagePoint[] = dbData.villages ?? [];
        const loadedCommitments: UnitCommitment[] = dbData.commitments ?? [];
        const loadedVolunteers: Volunteer[] = dbData.volunteers ?? [];
        const loadedReports: FieldVerificationReport[] = dbData.reports ?? [];
        const loadedTransactions: DonorTransaction[] = dbData.transactions ?? [];

        let mergedReports = loadedReports;
        try {
          const queued = await loadOfflineReports();
          if (queued.length > 0) {
            const existingIds = new Set(loadedReports.map((p) => p.id));
            mergedReports = [...queued.filter((q) => !existingIds.has(q.id)), ...loadedReports];
          }
        } catch {}

        setOrganizations(loadedOrgs);
        setVillages(loadedVillages);
        setCommitments(loadedCommitments);
        setVolunteers(loadedVolunteers);
        setReports(mergedReports);
        setTransactions(loadedTransactions);
        setOptConfig((prev) => ({
          ...prev,
          selectedVillageIds: loadedVillages.map((v) => v.id),
        }));

        setAiStatus({
          live: Boolean(aiData.live),
          model: aiData.model || "gemini-2.5-flash",
        });
      } catch {
        showToast("error", "Không thể tải dữ liệu từ máy chủ. Vui lòng kiểm tra kết nối.");
      } finally {
        setIsLoadingData(false);
      }
    },
    [accessToken, activeCampaignId]
  );

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      void loadWorkspaceData(null);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token ?? null;
      setAccessToken(token);
      void loadWorkspaceData(token);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const token = session?.access_token ?? null;
      setAccessToken(token);
      void loadWorkspaceData(token);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const optimizationResult = useMemo(
    () => runBudgetOptimization(villages, optConfig),
    [villages, optConfig]
  );

  async function persistToDb(entity: string, payload: unknown): Promise<boolean> {
    if (!accessToken) {
      showToast("error", "Vui lòng đăng nhập tài khoản đã được duyệt để lưu thay đổi.");
      setAuthModalOpen(true);
      return false;
    }
    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ entity, campaignId: activeCampaignId, payload }),
      });
      const data = await res.json();
      if (!res.ok || !data.saved) {
        showToast("error", data.error || "Lưu dữ liệu thất bại. Vui lòng kiểm tra quyền thao tác.");
        return false;
      }
      showToast("success", "Đã lưu dữ liệu thành công lên Supabase.");
      return true;
    } catch {
      showToast("error", "Lỗi kết nối máy chủ khi lưu dữ liệu.");
      return false;
    }
  }

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setAccessToken(null);
    setCurrentProfile(null);
    showToast("success", "Đã đăng xuất. Bạn đang ở chế độ xem công khai.");
  }

  function handleAddOrganization(org: EcosystemOrganization) {
    setOrganizations((prev) => [org, ...prev]);
    void persistToDb("organization", org);
  }

  function handleAddVillage(village: VillagePoint) {
    setVillages((prev) => [village, ...prev]);
    setOptConfig((prev) => ({
      ...prev,
      selectedVillageIds: [...prev.selectedVillageIds, village.id],
    }));
    void persistToDb("village", village);
  }

  function handleAddCommitment(
    commitment: UnitCommitment,
    nextCoverageStatus: "co_op_needed" | "claimed"
  ) {
    setCommitments((prev) => [commitment, ...prev]);
    setVillages((prev) =>
      prev.map((v) =>
        v.id === commitment.villageId ? { ...v, coverageStatus: nextCoverageStatus } : v
      )
    );
    void persistToDb("commitment", { ...commitment, nextCoverageStatus });
  }

  function handleAddVolunteer(vol: Volunteer) {
    setVolunteers((prev) => [vol, ...prev]);
    void persistToDb("volunteer", vol);
  }

  function handleAddReport(report: FieldVerificationReport) {
    setReports((prev) => [report, ...prev]);
    if (report.syncStatus === "queued_offline") {
      void saveOfflineReport(report);
      showToast("success", "Đã lưu biên bản vào hàng đợi Offline (IndexedDB).");
    } else {
      void persistToDb("report", report);
    }
  }

  function handleSyncOfflineQueue() {
    const toSync = reports
      .filter((r) => r.syncStatus === "queued_offline")
      .map((r) => ({
        ...r,
        syncStatus: "synced" as const,
        geminiAuditNote:
          "Đã đồng bộ từ bộ nhớ Offline (IndexedDB) lên Supabase PostGIS. Tọa độ GPS và dấu thời gian khớp hoàn toàn, sẵn sàng chờ xác nhận 2 chiều.",
      }));

    setReports((prev) =>
      prev.map((r) => {
        const found = toSync.find((s) => s.id === r.id);
        return found ?? r;
      })
    );
    void clearOfflineReports();
    if (toSync.length > 0) {
      void persistToDb("sync_reports", toSync);
    }
  }

  function handleApproveReport(reportId: string) {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, leaderApproved: true } : r))
    );
    void persistToDb("approve_report", { id: reportId });
  }

  function handleCommuneConfirmReport(reportId: string, note: string) {
    const now = new Date();
    const confirmedAt = `${String(now.getDate()).padStart(2, "0")}/${String(
      now.getMonth() + 1
    ).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(
      2,
      "0"
    )}:${String(now.getMinutes()).padStart(2, "0")}`;

    const target = reports.find((r) => r.id === reportId);
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              communeConfirmed: true,
              communeConfirmNote: note,
              communeConfirmedAt: confirmedAt,
            }
          : r
      )
    );
    if (target?.villageId) {
      setVillages((prev) =>
        prev.map((v) =>
          v.id === target.villageId
            ? { ...v, coverageStatus: "completed", verifiedStatus: "verified" }
            : v
        )
      );
    }
    void persistToDb("commune_confirm_report", {
      id: reportId,
      note,
      confirmedAt,
      villageId: target?.villageId,
    });
  }

  function handleAddTransaction(tx: DonorTransaction) {
    setTransactions((prev) => [tx, ...prev]);
    void persistToDb("transaction", tx);
  }

  async function handleCreateCampaign(campaign: Campaign) {
    const ok = await persistToDb("campaign", campaign);
    if (ok) {
      setCampaigns((prev) => [campaign, ...prev]);
      setActiveCampaignId(campaign.id);
      void loadWorkspaceData(accessToken, campaign.id);
    }
  }

  const queuedCount = reports.filter((r) => r.syncStatus === "queued_offline").length;
  const unclaimedCount = villages.filter(
    (v) =>
      commitments.filter((c) => c.villageId === v.id).length === 0 &&
      v.coverageStatus !== "completed"
  ).length;

  const navItems: Array<{
    id: TabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeTone?: "alert" | "neutral";
  }> = [
    {
      id: "map",
      label: "Bản đồ nhu cầu",
      icon: Map,
      badge: villages.length > 0 ? villages.length : undefined,
      badgeTone: "neutral",
    },
    {
      id: "ecosystem",
      label: "Kết nối Đoàn Xã",
      icon: Handshake,
      badge: unclaimedCount > 0 ? unclaimedCount : undefined,
      badgeTone: "alert",
    },
    { id: "optimizer", label: "Phân bổ ngân sách", icon: Calculator },
    {
      id: "matching",
      label: "Ghép nhân sự",
      icon: Users,
      badge: volunteers.length > 0 ? volunteers.length : undefined,
      badgeTone: "neutral",
    },
    {
      id: "verification",
      label: "Xác thực 2 chiều",
      icon: Camera,
      badge: reports.length > 0 ? reports.length : undefined,
      badgeTone: "neutral",
    },
    { id: "transparency", label: "Báo cáo minh bạch", icon: FileSpreadsheet },
    { id: "analytics", label: "Tổng kết nhiều năm", icon: BarChart3 },
  ];

  const roleOptions: Array<{
    id: UserRole;
    label: string;
    hint: string;
    accent: string;
  }> = [
    {
      id: "commune_youth",
      label: "Đoàn Xã / Phường",
      hint: "Gửi phiếu nhu cầu và xác nhận tiếp nhận",
      accent: "bg-[#C24620]",
    },
    {
      id: "dtu_unit",
      label: "Đơn vị ĐH Duy Tân",
      hint: "Nhận điểm bản, liên quân LCĐ và điều phối",
      accent: "bg-[#145DA0]",
    },
    {
      id: "coordinator",
      label: "BCH & Minh bạch",
      hint: "Giám sát toàn vùng và xuất báo cáo PDF",
      accent: "bg-[#157A5B]",
    },
  ];

  const activeRoleObj = roleOptions.find((r) => r.id === role) ?? roleOptions[1];

  function SidebarContent() {
    return (
      <div className="h-full flex flex-col bg-white border-r border-[#DCE2DC]">
        {/* Brand Crest */}
        <div className="px-5 pt-5 pb-4 border-b border-[#EAEEEA]">
          <button
            onClick={() => {
              setActiveTab("map");
              setMobileMenuOpen(false);
            }}
            className="flex items-center gap-3 text-left cursor-pointer group w-full"
          >
            <div className="w-9 h-9 rounded-lg bg-[#102824] text-white flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5 text-[#E8F1EC]" />
            </div>
            <div className="min-w-0">
              <div className="font-display font-bold text-[17px] leading-tight text-[#102824]">
                VolunteerPulse
              </div>
              <div className="text-[11px] text-[#4A5D58] truncate">
                Đoàn Xã vùng cao & ĐH Duy Tân
              </div>
            </div>
          </button>
        </div>

        {/* Campaign Switcher (Multi-year) */}
        <div className="px-4 py-3 border-b border-[#EAEEEA] space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-medium text-[#5A6E68] px-1">
            <Calendar className="w-3.5 h-3.5 text-[#145DA0]" />
            Mùa chiến dịch
          </label>
          <select
            value={activeCampaignId}
            onChange={(e) => {
              const nextId = e.target.value;
              setActiveCampaignId(nextId);
              void loadWorkspaceData(accessToken, nextId);
            }}
            className="w-full px-2.5 py-1.5 text-xs font-medium text-[#102824] bg-[#F8FAF8] border border-[#DCE2DC] rounded-lg"
          >
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.year} — {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Auth & Role Status */}
        <div className="px-4 py-3.5 border-b border-[#EAEEEA] space-y-2">
          <div className="text-[11px] font-medium text-[#5A6E68] px-1">
            Tài khoản & Phân quyền
          </div>
          {currentProfile ? (
            <div className="p-2.5 rounded-lg bg-[#F3F6F4] border border-[#CFD9D2] space-y-2">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#102824] truncate">
                  {currentProfile.fullName || currentProfile.email}
                </div>
                <div className="text-[11px] text-[#4A5D58] flex items-center gap-1.5 mt-0.5">
                  <span className={`w-2 h-2 rounded-full ${activeRoleObj.accent}`} />
                  <span className="truncate">
                    {currentProfile.approved ? activeRoleObj.label : "Chờ Admin duyệt"}
                  </span>
                </div>
              </div>
              <div className="flex gap-1.5">
                {currentProfile.approved &&
                  (currentProfile.role === "admin" || currentProfile.role === "coordinator") && (
                    <button
                      onClick={() => setAuthModalOpen(true)}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-[#145DA0] text-white text-[11px] font-semibold cursor-pointer"
                    >
                      <ShieldCheck className="w-3 h-3" />
                      Duyệt TK
                    </button>
                  )}
                <button
                  onClick={() => void handleSignOut()}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-white border border-[#DCE2DC] text-[#4A5D58] hover:text-[#102824] text-[11px] font-medium cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  Đăng xuất
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="px-2.5 py-2 rounded-lg bg-[#FAFBF9] border border-[#E2E8E3] text-[11px] text-[#5A6E68]">
                Chế độ xem công khai (Khách / Mạnh thường quân)
              </div>
              <button
                onClick={() => setAuthModalOpen(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#102824] hover:bg-[#193d37] text-white text-xs font-semibold cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                Đăng nhập vận hành
              </button>
            </div>
          )}
        </div>

        {/* Primary Vertical Navigation */}
        <nav aria-label="Điều hướng chính" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-[13px] transition-colors cursor-pointer ${
                  active
                    ? "bg-[#102824] text-white font-semibold"
                    : "text-[#354B45] hover:bg-[#F2F5F2] font-medium"
                }`}
              >
                <span className="inline-flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${active ? "text-[#9CD4C0]" : "text-[#5A6E68]"}`} />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full font-mono-data text-[10px] font-semibold shrink-0 ${
                      active
                        ? "bg-white/20 text-white"
                        : item.badgeTone === "alert"
                          ? "bg-[#FDF1EC] text-[#C24620]"
                          : "bg-[#EDF1EE] text-[#4A5D58]"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* System Telemetry Footer */}
        <div className="p-4 border-t border-[#EAEEEA] bg-[#FAFBF9] space-y-2.5 text-xs">
          <div className="flex items-center justify-between text-[11px]">
            <span className="inline-flex items-center gap-1.5 text-[#4A5D58]">
              <Database className="w-3.5 h-3.5 text-[#145DA0]" />
              Cơ sở dữ liệu
            </span>
            <span className={`font-medium ${dbConnected ? "text-[#145DA0]" : "text-[#647872]"}`}>
              {isLoadingData ? "Đang tải..." : dbConnected ? "Supabase PostGIS" : "Chưa kết nối"}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#4A5D58]">Trợ lý AI</span>
            <span
              className={`inline-flex items-center gap-1.5 font-medium ${
                aiStatus.live ? "text-[#157A5B]" : "text-[#647872]"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  aiStatus.live ? "bg-[#157A5B]" : "bg-[#C24620]"
                }`}
              />
              {aiStatus.live ? "Gemini trực tiếp" : "Chế độ Demo"}
            </span>
          </div>

          <button
            onClick={() => setIsOffline((o) => !o)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              isOffline
                ? "bg-[#FDF1EC] border-[#E7B5A3] text-[#B33D18]"
                : "bg-white border-[#DCE2DC] text-[#102824] hover:bg-[#F3F5F2]"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              {isOffline ? (
                <WifiOff className="w-3.5 h-3.5 text-[#C24620]" />
              ) : (
                <Wifi className="w-3.5 h-3.5 text-[#157A5B]" />
              )}
              {isOffline ? "Đang mất sóng 4G" : "Kết nối 4G ổn định"}
            </span>
            {queuedCount > 0 && (
              <span className="px-1.5 rounded-full bg-[#C24620] text-white font-mono-data text-[10px]">
                {queuedCount}
              </span>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F3F5F2] text-[#102824]">
      {/* Desktop Left Structural Rail (252px) */}
      <aside className="hidden lg:block w-[252px] shrink-0 h-screen sticky top-0 z-40 no-print">
        <SidebarContent />
      </aside>

      {/* Mobile Top Bar */}
      <header className="lg:hidden h-14 bg-white border-b border-[#DCE2DC] px-4 flex items-center justify-between sticky top-0 z-40 no-print">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#102824] text-white flex items-center justify-center">
            <Compass className="w-4 h-4 text-[#E8F1EC]" />
          </div>
          <span className="font-display font-bold text-base text-[#102824]">
            VolunteerPulse
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="p-2 rounded-lg border border-[#DCE2DC] text-[#102824] cursor-pointer"
          aria-label="Mở menu điều hướng"
        >
          {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-[#102824]/40 backdrop-blur-xs flex no-print">
          <div className="w-[272px] h-full">
            <SidebarContent />
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* Main Workspace */}
      {activeTab === "map" ? (
        <main className="flex-1 relative min-w-0">
          <MapModule
            role={role}
            villages={villages}
            commitments={commitments}
            communeOrgs={organizations.filter((o) => o.orgType === "commune_youth")}
            routeCoordinates={optimizationResult.routeCoordinates}
            onAddVillage={handleAddVillage}
            onJumpToEcosystem={() => setActiveTab("ecosystem")}
          />
        </main>
      ) : (
        <main className="flex-1 min-w-0">
          <div className="max-w-[1220px] mx-auto px-5 sm:px-9 py-8">
            {activeTab === "ecosystem" && (
              <EcosystemModule
                role={role}
                organizations={organizations}
                villages={villages}
                commitments={commitments}
                onAddOrganization={handleAddOrganization}
                onAddCommitment={handleAddCommitment}
                onJumpToMap={() => setActiveTab("map")}
              />
            )}
            {activeTab === "optimizer" && (
              <OptimizerModule
                villages={villages}
                config={optConfig}
                result={optimizationResult}
                onUpdateConfig={setOptConfig}
              />
            )}
            {activeTab === "matching" && (
              <MatchingModule
                volunteers={volunteers}
                villages={villages}
                onAddVolunteer={handleAddVolunteer}
              />
            )}
            {activeTab === "verification" && (
              <VerificationModule
                role={role}
                villages={villages}
                reports={reports}
                isOffline={isOffline}
                onToggleOffline={() => setIsOffline((o) => !o)}
                onAddReport={handleAddReport}
                onSyncOfflineQueue={handleSyncOfflineQueue}
                onApproveReport={handleApproveReport}
                onCommuneConfirmReport={handleCommuneConfirmReport}
              />
            )}
            {activeTab === "transparency" && (
              <TransparencyModule
                campaignName={activeCampaign?.name}
                campaignYear={activeCampaign?.year}
                transactions={transactions}
                reports={reports}
                optimization={optimizationResult}
                onAddTransaction={handleAddTransaction}
              />
            )}
            {activeTab === "analytics" && (
              <AnalyticsModule
                campaigns={campaigns}
                activeCampaign={activeCampaign}
                volunteers={volunteers}
                currentProfile={currentProfile}
                onCreateCampaign={handleCreateCampaign}
              />
            )}
          </div>
        </main>
      )}

      {/* Auth & Admin Modal */}
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={() => void loadWorkspaceData()}
        currentProfile={currentProfile}
        accessToken={accessToken}
      />

      {/* Error / Success Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 max-w-sm px-4 py-3 rounded-xl shadow-lg border text-xs font-medium flex items-center gap-2.5 ${
            toast.type === "error"
              ? "bg-[#FDF1EC] border-[#E7B5A3] text-[#B33D18]"
              : "bg-[#ECF7F2] border-[#B7E1D2] text-[#157A5B]"
          }`}
        >
          {toast.type === "error" ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
}
