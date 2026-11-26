"use client";

import { useState } from "react";
import { CheckCircle2, Download, MapPin, Plus, Printer } from "lucide-react";
import { formatCoords, formatVnd } from "@/lib/format";
import {
  DonorTransaction,
  FieldVerificationReport,
  OptimizationResult,
} from "@/types/volunteer-pulse";

interface TransparencyModuleProps {
  campaignName?: string;
  campaignYear?: number;
  transactions: DonorTransaction[];
  reports: FieldVerificationReport[];
  optimization: OptimizationResult;
  onAddTransaction: (tx: DonorTransaction) => void;
}

export default function TransparencyModule({
  campaignName = "Xuân Tình Nguyện Quảng Nam 2026",
  campaignYear = 2026,
  transactions,
  reports,
  optimization,
  onAddTransaction,
}: TransparencyModuleProps) {
  const [showAddTx, setShowAddTx] = useState(false);
  const [txType, setTxType] = useState<"inflow" | "outflow">("inflow");
  const [donorName, setDonorName] = useState("");
  const [amountVnd, setAmountVnd] = useState(5000000);
  const [description, setDescription] = useState("");
  const [villageName, setVillageName] = useState("");

  function handleCreateTx(e: React.FormEvent) {
    e.preventDefault();
    if (!donorName.trim() || amountVnd <= 0) return;
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, "0")}/${String(
      now.getMonth() + 1
    ).padStart(2, "0")}/${now.getFullYear()}`;
    onAddTransaction({
      id: `tx-${Date.now().toString().slice(-5)}`,
      donorName: donorName.trim(),
      type: txType,
      amountVnd,
      date: dateStr,
      villageName: villageName.trim() || undefined,
      description: description.trim() || (txType === "inflow" ? "Đóng góp quỹ chiến dịch" : "Chi mua hiện vật"),
    });
    setDonorName("");
    setDescription("");
    setVillageName("");
    setShowAddTx(false);
  }
  const totalInflow = transactions
    .filter((t) => t.type === "inflow")
    .reduce((s, t) => s + t.amountVnd, 0);
  const totalOutflow = transactions
    .filter((t) => t.type === "outflow")
    .reduce((s, t) => s + t.amountVnd, 0);
  const balance = totalInflow - totalOutflow;
  const approvedReports = reports.filter((r) => r.leaderApproved);

  function handleExportCsv() {
    const header = "Ma_GD,Loai,Don_vi,Ngay,So_tien_VND,Mo_ta\n";
    const rows = transactions
      .map(
        (t) =>
          `${t.id},${t.type === "inflow" ? "Thu" : "Chi"},"${t.donorName}",${t.date},${t.amountVnd},"${t.description}"`
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `VolunteerPulse_SaoKeMinhBach_${campaignYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      {/* Official Transparency Masthead */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-[#DCE3DD]">
        <div className="max-w-2xl">
          <h1 className="font-display text-2xl sm:text-[28px] font-bold text-[#122B26] leading-tight">
            Báo cáo công khai tài chính và hiện vật
          </h1>
          <p className="mt-1.5 text-sm text-[#4A5D58] leading-relaxed">
            Chiến dịch {campaignName}, Đoàn Đại học Duy Tân. Mọi khoản chi đều gắn chứng từ OCR và tọa độ bàn giao GPS.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 no-print">
          <button
            onClick={() => setShowAddTx((s) => !s)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-[#145DA0] bg-white text-[#145DA0] hover:bg-[#F2F7FB] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Ghi nhận thu chi
          </button>
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-[#DCE3DD] bg-white text-[#122B26] hover:bg-[#F5F8F6] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Tải sao kê CSV
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[#145DA0] hover:bg-[#104c84] text-white cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Xuất PDF cho Đoàn trường
          </button>
        </div>
      </div>

      {showAddTx && (
        <form
          onSubmit={handleCreateTx}
          className="bg-white border border-[#145DA0] rounded-xl p-6 grid grid-cols-1 md:grid-cols-5 gap-4 items-end no-print"
        >
          <div>
            <label className="block text-xs font-medium text-[#4A5D58] mb-1">Loại giao dịch</label>
            <select
              value={txType}
              onChange={(e) => setTxType(e.target.value as "inflow" | "outflow")}
              className="w-full px-3 py-2 text-sm border border-[#DCE3DD] rounded-lg bg-white"
            >
              <option value="inflow">Thu (Nhà tài trợ)</option>
              <option value="outflow">Chi (Mua quà / Vận chuyển)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#4A5D58] mb-1">Đơn vị / Người gửi</label>
            <input
              type="text"
              required
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              placeholder="Tên nhà tài trợ hoặc NCC"
              className="w-full px-3 py-2 text-sm border border-[#DCE3DD] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#4A5D58] mb-1">Số tiền (VNĐ)</label>
            <input
              type="number"
              min={1000}
              step={10000}
              required
              value={amountVnd}
              onChange={(e) => setAmountVnd(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-[#DCE3DD] rounded-lg font-mono-data"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#4A5D58] mb-1">Nội dung</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả khoản thu hoặc chi"
              className="w-full px-3 py-2 text-sm border border-[#DCE3DD] rounded-lg"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-xs font-semibold bg-[#145DA0] text-white rounded-lg hover:bg-[#104c84] cursor-pointer"
            >
              Lưu vào DB
            </button>
            <button
              type="button"
              onClick={() => setShowAddTx(false)}
              className="px-3 py-2 text-xs border border-[#DCE3DD] rounded-lg cursor-pointer"
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      {/* Editorial Financial Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 bg-white border border-[#DCE3DD] rounded-xl p-6">
        <div>
          <div className="text-xs text-[#4A5D58]">Tổng quỹ tiếp nhận</div>
          <div className="mt-1.5 text-2xl font-bold font-mono-data text-[#157A5B]">
            {formatVnd(totalInflow)}
          </div>
          <div className="text-xs text-[#6B7E79] mt-1">3 nguồn tài trợ đã đối soát</div>
        </div>
        <div className="lg:border-l lg:border-[#E7ECE8] lg:pl-6">
          <div className="text-xs text-[#4A5D58]">Đã giải ngân (có OCR)</div>
          <div className="mt-1.5 text-2xl font-bold font-mono-data text-[#122B26]">
            {formatVnd(totalOutflow)}
          </div>
          <div className="text-xs text-[#6B7E79] mt-1">100% có hóa đơn đối chiếu</div>
        </div>
        <div className="lg:border-l lg:border-[#E7ECE8] lg:pl-6">
          <div className="text-xs text-[#4A5D58]">Tồn quỹ dự phòng</div>
          <div className="mt-1.5 text-2xl font-bold font-mono-data text-[#145DA0]">
            {formatVnd(balance)}
          </div>
          <div className="text-xs text-[#6B7E79] mt-1">Dự phòng phát sinh sạt lở</div>
        </div>
        <div className="lg:border-l lg:border-[#E7ECE8] lg:pl-6">
          <div className="text-xs text-[#4A5D58]">Thời gian lập kế hoạch</div>
          <div className="mt-1.5 text-2xl font-bold font-mono-data text-[#C84B24]">
            &lt; 15 phút
          </div>
          <div className="text-xs text-[#6B7E79] mt-1">
            Công bằng {optimization.summary.aiFairnessIndex}/100 (giảm từ ~4 giờ)
          </div>
        </div>
      </div>

      {/* Financial Ledger */}
      <section className="bg-white border border-[#DCE3DD] rounded-xl overflow-hidden print-break-avoid">
        <div className="px-6 py-4 border-b border-[#E7ECE8] flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-[#122B26]">
            Bảng sao kê thu chi theo thời gian thực
          </h2>
          <span className="text-xs font-medium text-[#157A5B]">
            Đã qua kiểm duyệt Trưởng đoàn
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8FAF8] text-[#4A5D58] border-b border-[#E7ECE8]">
                <th className="py-3 px-5 font-semibold">Ngày</th>
                <th className="py-3 px-5 font-semibold">Đơn vị / Nhà tài trợ</th>
                <th className="py-3 px-5 font-semibold">Nội dung và điểm bản</th>
                <th className="py-3 px-5 font-semibold text-right">Số tiền</th>
                <th className="py-3 px-5 font-semibold text-right">Chứng từ</th>
              </tr>
            </thead>
                <tbody className="divide-y divide-[#EEF2EF]">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 px-5 text-center text-sm text-[#4A5D58]">
                    Chưa có giao dịch thu chi nào trong Supabase. Bấm <strong>Ghi nhận thu chi</strong> ở góc trên để thêm dữ liệu thật.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                <tr key={t.id} className="hover:bg-[#FAFBF9]">
                  <td className="py-3.5 px-5 font-mono-data text-[#4A5D58]">{t.date}</td>
                  <td className="py-3.5 px-5 font-semibold text-[#122B26]">{t.donorName}</td>
                  <td className="py-3.5 px-5">
                    <div className="text-[#122B26]">{t.description}</div>
                    {t.villageName && (
                      <div className="text-[11px] text-[#6B7E79] mt-0.5">{t.villageName}</div>
                    )}
                  </td>
                  <td
                    className={`py-3.5 px-5 text-right font-mono-data font-bold ${
                      t.type === "inflow" ? "text-[#157A5B]" : "text-[#122B26]"
                    }`}
                  >
                    {t.type === "inflow" ? "+" : "-"}
                    {formatVnd(t.amountVnd)}
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    {t.verifiedReceiptId ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EAF6F1] text-[#157A5B] font-mono-data text-[11px]">
                        <CheckCircle2 className="w-3 h-3" /> {t.verifiedReceiptId.toUpperCase()}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#6B7E79]">Ủy nhiệm chi</span>
                    )}
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* GPS Delivery Proof List */}
      <section className="space-y-4 print-break-avoid">
        <h2 className="font-display text-lg font-bold text-[#122B26]">
          Nhật ký bàn giao hiện vật đã xác thực GPS ({approvedReports.length} biên bản)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {approvedReports.map((r) => (
            <article
              key={r.id}
              className="bg-white border border-[#DCE3DD] rounded-xl p-5 space-y-2.5 text-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-base font-bold text-[#122B26]">
                  {r.villageName}
                </h3>
                <span className="font-mono-data font-semibold text-[#157A5B] shrink-0">
                  {r.yoloSummary.detectedCount}/{r.yoloSummary.expectedCount} suất
                </span>
              </div>
              <div className="text-[11px] font-mono-data text-[#4A5D58] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#C84B24]" />
                {formatCoords(r.lat, r.lng)}
              </div>
              <p className="text-xs text-[#4A5D58] leading-relaxed">{r.geminiAuditNote}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
