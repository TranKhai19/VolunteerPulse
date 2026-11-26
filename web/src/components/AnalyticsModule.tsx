"use client";

import { useEffect, useState } from "react";
import { Award, BarChart3, CalendarPlus, Printer } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatVnd } from "@/lib/format";
import { Campaign, UserProfile, Volunteer } from "@/types/volunteer-pulse";

interface CampaignAnalyticsRow {
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

interface AnalyticsModuleProps {
  campaigns: Campaign[];
  activeCampaign?: Campaign;
  volunteers: Volunteer[];
  currentProfile: UserProfile | null;
  onCreateCampaign: (campaign: Campaign) => Promise<void>;
}

export default function AnalyticsModule({
  activeCampaign,
  volunteers,
  currentProfile,
  onCreateCampaign,
}: AnalyticsModuleProps) {
  const [rows, setRows] = useState<CampaignAnalyticsRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState("");
  const [newYear, setNewYear] = useState(new Date().getFullYear() + 1);
  const [newProvince, setNewProvince] = useState("Quảng Nam");
  const [creating, setCreating] = useState(false);

  const [selectedVolId, setSelectedVolId] = useState<string>(volunteers[0]?.id ?? "");

  const isAdmin =
    currentProfile?.approved &&
    (currentProfile.role === "admin" || currentProfile.role === "coordinator");

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics");
      const data = await res.json();
      setRows(data.rows ?? []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchAnalytics();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    const id = `camp-${newYear}-${Date.now().toString().slice(-4)}`;
    await onCreateCampaign({
      id,
      name: newName.trim(),
      year: newYear,
      province: newProvince.trim() || "Quảng Nam",
      status: "planning",
      isDefault: false,
    });
    setNewName("");
    setCreating(false);
    void fetchAnalytics();
  }

  const selectedVol = volunteers.find((v) => v.id === selectedVolId) ?? volunteers[0];

  const chartData = rows.map((r) => ({
    label: `${r.year} (${r.campaignName.slice(0, 14)})`,
    "Số điểm bản": r.villagesCount,
    "Hộ dân (÷10)": Math.round(r.householdsReached / 10),
    "Giải ngân (Tr đ)": Math.round(r.totalOutflowVnd / 1_000_000),
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-[#DCE3DD]">
        <div className="max-w-2xl">
          <h1 className="font-display text-2xl sm:text-[28px] font-bold text-[#122B26] leading-tight">
            Tổng kết nhiều năm & Chứng nhận Tình nguyện viên
          </h1>
          <p className="mt-1.5 text-sm text-[#4A5D58] leading-relaxed">
            Theo dõi tác động dài hạn qua các mùa chiến dịch, khởi tạo mùa mới cho các năm tiếp theo
            và cấp Giấy chứng nhận điện tử cho sinh viên tham gia.
          </p>
        </div>
      </div>

      {/* Multi-year Chart & Table */}
      <section className="bg-white border border-[#DCE3DD] rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#145DA0]" />
          <h2 className="font-display text-lg font-bold text-[#122B26]">
            So sánh tác động qua các mùa chiến dịch
          </h2>
        </div>

        {loading ? (
          <p className="text-xs text-[#5A6E68]">Đang tổng hợp dữ liệu các năm...</p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-[#5A6E68]">Chưa có dữ liệu thống kê chiến dịch.</p>
        ) : (
          <>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5EBE6" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="Số điểm bản" fill="#145DA0" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Giải ngân (Tr đ)" fill="#157A5B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#DCE3DD] text-[#5A6E68]">
                    <th className="py-2.5 pr-3 font-semibold">Năm / Chiến dịch</th>
                    <th className="py-2.5 px-3 font-semibold">Điểm bản</th>
                    <th className="py-2.5 px-3 font-semibold">Hộ dân / Trẻ em</th>
                    <th className="py-2.5 px-3 font-semibold">Tổng thu</th>
                    <th className="py-2.5 px-3 font-semibold">Tổng chi</th>
                    <th className="py-2.5 pl-3 font-semibold">Xác nhận 2 chiều</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2EF]">
                  {rows.map((r) => (
                    <tr key={r.campaignId}>
                      <td className="py-3 pr-3 font-semibold text-[#122B26]">
                        {r.year} — {r.campaignName}
                      </td>
                      <td className="py-3 px-3 font-mono-data">
                        {r.verifiedVillagesCount}/{r.villagesCount}
                      </td>
                      <td className="py-3 px-3 font-mono-data">
                        {r.householdsReached} hộ / {r.childrenReached} em
                      </td>
                      <td className="py-3 px-3 font-mono-data text-[#157A5B]">
                        {formatVnd(r.totalInflowVnd)}
                      </td>
                      <td className="py-3 px-3 font-mono-data text-[#C24620]">
                        {formatVnd(r.totalOutflowVnd)}
                      </td>
                      <td className="py-3 pl-3 font-mono-data">
                        {r.confirmedReportsCount}/{r.reportsCount} biên bản
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Create New Season Campaign (Admin/Coordinator only) */}
      <section className="bg-white border border-[#DCE3DD] rounded-xl p-6 space-y-4 no-print">
        <div className="flex items-center gap-2">
          <CalendarPlus className="w-5 h-5 text-[#157A5B]" />
          <h2 className="font-display text-lg font-bold text-[#122B26]">
            Khởi tạo mùa chiến dịch mới (Vận hành các năm sau)
          </h2>
        </div>

        {isAdmin ? (
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[#4A5D58] mb-1">
                Tên chiến dịch
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="VD: Xuân Tình Nguyện Quảng Nam 2027"
                className="w-full px-3 py-2 text-sm border border-[#DCE3DD] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4A5D58] mb-1">Năm</label>
              <input
                type="number"
                min={2025}
                max={2040}
                value={newYear}
                onChange={(e) => setNewYear(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-[#DCE3DD] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4A5D58] mb-1">Địa bàn chính</label>
              <input
                type="text"
                value={newProvince}
                onChange={(e) => setNewProvince(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#DCE3DD] rounded-lg"
              />
            </div>
            <div className="md:col-span-4">
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 rounded-lg bg-[#157A5B] hover:bg-[#116349] text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
              >
                {creating ? "Đang tạo..." : "Tạo mùa chiến dịch mới"}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-xs text-[#5A6E68]">
            Chỉ tài khoản <strong>Admin Đoàn trường</strong> hoặc <strong>BCH Điều phối</strong> đã
            được duyệt mới có quyền khởi tạo mùa chiến dịch mới.
          </p>
        )}
      </section>

      {/* Electronic Volunteer Certificate */}
      <section className="bg-white border border-[#DCE3DD] rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-[#C24620]" />
            <h2 className="font-display text-lg font-bold text-[#122B26]">
              Giấy chứng nhận Tình nguyện viên điện tử
            </h2>
          </div>
          {volunteers.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={selectedVol?.id ?? ""}
                onChange={(e) => setSelectedVolId(e.target.value)}
                className="px-3 py-1.5 text-xs border border-[#DCE3DD] rounded-lg bg-white"
              >
                {volunteers.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.fullName} ({v.studentId || v.faculty})
                  </option>
                ))}
              </select>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#145DA0] text-white text-xs font-semibold cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                In / Lưu PDF
              </button>
            </div>
          )}
        </div>

        {selectedVol ? (
          <div className="border-2 border-[#102824] rounded-xl p-8 bg-[#FAFBF9] text-center space-y-3">
            <div className="text-xs font-semibold tracking-widest uppercase text-[#145DA0]">
              ĐOÀN TNCS HỒ CHÍ MINH — TRƯỜNG ĐẠI HỌC DUY TÂN
            </div>
            <h3 className="font-display text-2xl font-bold text-[#102824]">
              GIẤY CHỨNG NHẬN TÌNH NGUYỆN VIÊN
            </h3>
            <p className="text-xs text-[#4A5D58]">Trân trọng chứng nhận đồng chí:</p>
            <div className="font-display text-2xl font-bold text-[#C24620]">
              {selectedVol.fullName}
            </div>
            <div className="text-xs text-[#4A5D58]">
              MSSV: <span className="font-mono-data font-semibold">{selectedVol.studentId || "—"}</span>{" "}
              • Đơn vị: <span className="font-semibold">{selectedVol.faculty || "ĐH Duy Tân"}</span>
            </div>
            <p className="text-sm text-[#122B26] max-w-xl mx-auto pt-2 leading-relaxed">
              Đã hoàn thành xuất sắc nhiệm vụ trong chiến dịch{" "}
              <strong>{activeCampaign?.name || "Xuân Tình Nguyện Quảng Nam 2026"}</strong> với kỹ
              năng chuyên môn: {selectedVol.skills.join(", ") || "Hỗ trợ cộng đồng"}.
            </p>
            <div className="pt-4 flex items-center justify-between text-[11px] text-[#5A6E68] border-t border-[#DCE3DD] mt-4">
              <span>Mã xác thực: VP-{activeCampaign?.year || 2026}-{selectedVol.id.toUpperCase()}</span>
              <span>Xác nhận điện tử bởi hệ thống VolunteerPulse</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-[#5A6E68]">
            Đăng nhập bằng tài khoản được duyệt để xem danh sách TNV và xuất Giấy chứng nhận điện tử.
          </p>
        )}
      </section>
    </div>
  );
}
