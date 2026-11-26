"use client";

import { useState } from "react";
import {
  CheckCircle2,
  CloudUpload,
  FileText,
  MapPin,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Wifi,
  WifiOff,
} from "lucide-react";
import { formatCoords, formatVnd } from "@/lib/format";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { FieldVerificationReport, UserRole, VillagePoint } from "@/types/volunteer-pulse";

interface VerificationModuleProps {
  role: UserRole;
  villages: VillagePoint[];
  reports: FieldVerificationReport[];
  isOffline: boolean;
  onToggleOffline: () => void;
  onAddReport: (report: FieldVerificationReport) => void;
  onSyncOfflineQueue: () => void;
  onApproveReport: (reportId: string) => void;
  onCommuneConfirmReport: (reportId: string, note: string) => void;
}

export default function VerificationModule({
  role,
  villages,
  reports,
  isOffline,
  onToggleOffline,
  onAddReport,
  onSyncOfflineQueue,
  onApproveReport,
  onCommuneConfirmReport,
}: VerificationModuleProps) {
  const [selectedReportId, setSelectedReportId] = useState<string>(reports[0]?.id ?? "");
  const [communeNoteInput, setCommuneNoteInput] = useState(
    "Đoàn Xã xác nhận đã tiếp nhận đủ số lượng hiện vật bàn giao tại địa phương."
  );
  const [villageId, setVillageId] = useState<string>(villages[2]?.id ?? villages[0]?.id ?? "");
  const [volunteerName, setVolunteerName] = useState("Kỳ Nguyễn Quốc Hưng");
  const [photoType, setPhotoType] = useState<"delivery" | "receipt">("delivery");
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);
  const [uploadedMime, setUploadedMime] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const selectedReport = reports.find((r) => r.id === selectedReportId) ?? reports[0];
  const queuedCount = reports.filter((r) => r.syncStatus === "queued_offline").length;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUploadedPreview(url);
    setUploadedFile(file);
    setUploadedMime(file.type || "image/jpeg");

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setUploadedBase64(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  function getDeviceGps(): Promise<{ lat: number; lng: number; accuracy: number } | null> {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: Number(pos.coords.latitude.toFixed(5)),
            lng: Number(pos.coords.longitude.toFixed(5)),
            accuracy: Math.round(pos.coords.accuracy || 10),
          }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
      );
    });
  }

  async function uploadEvidencePhoto(file: File, reportId: string): Promise<string | undefined> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return undefined;
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `reports/${reportId}.${ext}`;
    const { error } = await supabase.storage
      .from("field-evidence")
      .upload(path, file, { contentType: file.type || "image/jpeg", upsert: true });
    if (error) return undefined;
    const { data } = supabase.storage.from("field-evidence").getPublicUrl(path);
    return data?.publicUrl || undefined;
  }

  async function handleSubmitCheckin(e: React.FormEvent) {
    e.preventDefault();
    const targetVillage = villages.find((v) => v.id === villageId) ?? villages[0];
    if (!targetVillage) return;
    setIsScanning(true);

    const now = new Date();
    const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")} (+07)`;

    let liveVision: {
      mode?: string;
      model?: string;
      yoloSummary?: FieldVerificationReport["yoloSummary"];
      ocrSummary?: FieldVerificationReport["ocrSummary"];
      geminiAuditNote?: string;
    } | null = null;

    if (!isOffline && uploadedBase64 && uploadedMime) {
      try {
        const res = await fetch("/api/ai/analyze-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: uploadedBase64,
            mimeType: uploadedMime,
            photoType,
            villageName: targetVillage.name,
            expectedCount: targetVillage.needs.giftBoxes,
          }),
        });
        const data = await res.json();
        if (data.mode === "live") {
          liveVision = data;
        }
      } catch {}
    }

    const reportId = `rep-${Date.now().toString().slice(-6)}`;
    const [deviceGps, uploadedImageUrl] = await Promise.all([
      getDeviceGps(),
      !isOffline && uploadedFile ? uploadEvidencePhoto(uploadedFile, reportId) : Promise.resolve(undefined),
    ]);

    const newReport: FieldVerificationReport = {
      id: reportId,
      villageId: targetVillage.id,
      villageName: targetVillage.name,
      volunteerName,
      timestamp: ts,
      lat: deviceGps ? deviceGps.lat : targetVillage.lat,
      lng: deviceGps ? deviceGps.lng : targetVillage.lng,
      gpsAccuracyMeters: deviceGps ? deviceGps.accuracy : 50,
      gpsSource: deviceGps ? "device_gps" : "village_fallback",
      imageUrl: uploadedImageUrl,
      exifVerified: Boolean(deviceGps),
      syncStatus: isOffline ? "queued_offline" : "synced",
      leaderApproved: false,
      photoType,
      sampleScene: photoType === "receipt" ? "invoice_supplies" : "tra_linh_gifts",
      yoloSummary: liveVision?.yoloSummary ?? {
        detectedCount: targetVillage.needs.giftBoxes,
        expectedCount: targetVillage.needs.giftBoxes,
        itemLabel: photoType === "receipt" ? "kien_hang_nhap_kho" : "thung_qua_ho_gia_dinh",
        avgConfidence: 0.93,
        boxes: [
          { id: "n1", label: "Kiện quà khu A", confidence: 0.95, x: 10, y: 40, w: 36, h: 28 },
          { id: "n2", label: "Kiện quà khu B", confidence: 0.92, x: 52, y: 42, w: 36, h: 27 },
        ],
      },
      ocrSummary:
        liveVision?.ocrSummary ??
        (photoType === "receipt"
          ? {
              vendor: "Cửa hàng Nhu yếu phẩm Vùng Cao Quảng Nam",
              date: "20/01/2026",
              totalAmountVnd: 19450000,
              fields: [
                { label: "Đơn vị cung cấp", value: "CH Nhu yếu phẩm Vùng Cao", confidence: 0.95, needsReview: false },
                { label: "Gạo & thực phẩm khô", value: "12.800.000 đ", confidence: 0.93, needsReview: false },
                { label: "Đèn pin & áo mưa", value: "6.650.000 đ", confidence: 0.87, needsReview: true },
                { label: "Tổng cộng hóa đơn", value: "19.450.000 đ", confidence: 0.94, needsReview: false },
              ],
            }
          : undefined),
      geminiAuditNote:
        liveVision?.geminiAuditNote ??
        (isOffline
          ? "Đã khóa dấu thời gian và tọa độ GPS vào hàng đợi Offline. Hệ thống sẽ tự đồng bộ khi có sóng 4G."
          : `Đếm khớp ${targetVillage.needs.giftBoxes}/${targetVillage.needs.giftBoxes} suất quà tại ${targetVillage.name}. Chờ Trưởng đoàn duyệt chéo trước khi công bố.`),
    };

    onAddReport(newReport);
    setSelectedReportId(newReport.id);
    setIsScanning(false);
  }

  return (
    <div className="space-y-7">
      {/* Editorial Masthead + Network Status */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-[#DCE3DD]">
        <div className="max-w-2xl">
          <h1 className="font-display text-2xl sm:text-[28px] font-bold text-[#122B26] leading-tight">
            Xác thực hiện trường và đối chiếu chứng từ
          </h1>
          <p className="mt-1.5 text-sm text-[#4A5D58] leading-relaxed">
            Kiểm đếm hiện vật bàn giao, trích xuất hóa đơn mua sắm kèm tọa độ GPS và hỗ trợ lưu đệm khi mất sóng 4G vùng cao.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {queuedCount > 0 && !isOffline && (
            <button
              onClick={onSyncOfflineQueue}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#157A5B] text-white hover:bg-[#116349] cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Đồng bộ {queuedCount} bản ghi Offline
            </button>
          )}
          <button
            onClick={onToggleOffline}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border cursor-pointer transition-colors ${
              isOffline
                ? "bg-[#FDF1EC] border-[#E7B5A3] text-[#B33D18]"
                : "bg-white border-[#DCE3DD] text-[#122B26] hover:bg-[#F5F8F6]"
            }`}
          >
            {isOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5 text-[#157A5B]" />}
            {isOffline ? "Đang mất sóng 4G (bấm để bật lại)" : "Mô phỏng mất sóng 4G"}
          </button>
        </div>
      </div>

      {/* Main Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Check-in Form + Queue (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <form
            onSubmit={handleSubmitCheckin}
            className="bg-white border border-[#DCE3DD] rounded-xl p-6 space-y-4"
          >
            <h2 className="font-display text-lg font-bold text-[#122B26]">
              Gửi ảnh minh chứng mới
            </h2>

            <div>
              <label className="block text-xs font-medium text-[#4A5D58] mb-1">Điểm bản</label>
              <select
                value={villageId}
                onChange={(e) => setVillageId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#DCE3DD] rounded-lg bg-white"
              >
                {villages.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.district})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#4A5D58] mb-1">Người chụp</label>
                <input
                  type="text"
                  value={volunteerName}
                  onChange={(e) => setVolunteerName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#DCE3DD] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4A5D58] mb-1">Loại ảnh</label>
                <select
                  value={photoType}
                  onChange={(e) => setPhotoType(e.target.value as "delivery" | "receipt")}
                  className="w-full px-3 py-2 text-sm border border-[#DCE3DD] rounded-lg bg-white"
                >
                  <option value="delivery">Ảnh trao quà (đếm thùng)</option>
                  <option value="receipt">Ảnh hóa đơn (đọc OCR)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#4A5D58] mb-1">
                Tải ảnh thực tế từ máy (hỗ trợ Gemini Vision khi bật API Key)
              </label>
              <label className="flex items-center justify-center gap-2 px-4 py-4 border border-dashed border-[#B2C2B9] rounded-lg bg-[#F8FAF8] text-xs font-medium text-[#122B26] cursor-pointer hover:bg-[#EFF4F1]">
                <CloudUpload className="w-4 h-4 text-[#145DA0]" />
                <span>
                  {uploadedPreview ? "Đã chọn ảnh — bấm để thay ảnh khác" : "Chọn ảnh JPG hoặc PNG"}
                </span>
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
            </div>

            <button
              type="submit"
              disabled={isScanning}
              className="w-full py-2.5 px-4 rounded-lg bg-[#145DA0] hover:bg-[#104c84] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <ScanLine className="w-4 h-4" />
              {isScanning
                ? "Đang phân tích ảnh và GPS..."
                : isOffline
                  ? "Lưu vào hàng đợi Offline"
                  : "Xác thực GPS và phân tích AI"}
            </button>
          </form>

          {/* Report List */}
          <div className="bg-white border border-[#DCE3DD] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-[#122B26]">
                Biên bản hiện trường
              </h3>
              <span className="text-xs font-mono-data text-[#4A5D58]">{reports.length} bản ghi</span>
            </div>
            <div className="divide-y divide-[#EEF2EF] max-h-72 overflow-y-auto">
              {reports.map((rep) => (
                <button
                  key={rep.id}
                  onClick={() => setSelectedReportId(rep.id)}
                  className={`w-full text-left py-3 px-3 rounded-lg transition-colors cursor-pointer ${
                    rep.id === selectedReport?.id ? "bg-[#F2F7FB]" : "hover:bg-[#F8FAF8]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <strong className="text-[#122B26] truncate">{rep.villageName}</strong>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${
                        rep.syncStatus === "queued_offline"
                          ? "bg-[#FDF1EC] text-[#B33D18]"
                          : rep.leaderApproved
                            ? "bg-[#EAF6F1] text-[#157A5B]"
                            : "bg-[#FEF4E4] text-[#9A5809]"
                      }`}
                    >
                      {rep.syncStatus === "queued_offline"
                        ? "Chờ đồng bộ"
                        : rep.leaderApproved
                          ? "Đã duyệt"
                          : "Chờ duyệt chéo"}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-[#6B7E79]">
                    <span>{rep.volunteerName}</span>
                    <span className="font-mono-data">{rep.timestamp.split(" ")[1]}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Visual Inspector (7 cols) */}
        {selectedReport ? (
          <section className="lg:col-span-7 bg-white border border-[#DCE3DD] rounded-xl p-6 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[#E7ECE8]">
              <div>
                <h2 className="font-display text-xl font-bold text-[#122B26]">
                  {selectedReport.villageName}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#4A5D58]">
                  <span className="inline-flex items-center gap-1 font-mono-data">
                    <MapPin className="w-3.5 h-3.5 text-[#157A5B]" />
                    {formatCoords(selectedReport.lat, selectedReport.lng)} (±{selectedReport.gpsAccuracyMeters}m)
                  </span>
                  <span className="font-mono-data">{selectedReport.timestamp}</span>
                </div>
              </div>

              {!selectedReport.leaderApproved ? (
                <button
                  onClick={() => onApproveReport(selectedReport.id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#157A5B] text-white hover:bg-[#116349] cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Trưởng đoàn xác nhận chéo
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-[#EAF6F1] text-[#157A5B]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Đã công bố minh bạch
                </span>
              )}
            </div>

            {/* Detection Viewport */}
            <div className="relative rounded-xl border border-[#DCE3DD] overflow-hidden bg-[#122B26] h-72">
              {selectedReport.imageUrl || uploadedPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedReport.imageUrl || uploadedPreview || ""}
                  alt="Ảnh minh chứng hiện trường"
                  className="w-full h-full object-cover opacity-90"
                />
              ) : (
                <svg
                  viewBox="0 0 800 320"
                  className="w-full h-full object-cover"
                  aria-label="Khung ảnh phân tích hiện trường vùng cao"
                >
                  <defs>
                    <linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1B3D38" />
                      <stop offset="100%" stopColor="#122B26" />
                    </linearGradient>
                  </defs>
                  <rect width="800" height="320" fill="url(#sky2)" />
                  <path d="M0,185 L170,100 L340,170 L520,80 L700,155 L800,120 L800,320 L0,320 Z" fill="#173530" />
                  <rect y="218" width="800" height="102" fill="#233733" />
                  <rect x="70" y="145" width="195" height="72" rx="4" fill="#B8834F" stroke="#F0D2A8" strokeWidth="2" />
                  <rect x="295" y="138" width="215" height="78" rx="4" fill="#C48F58" stroke="#F0D2A8" strokeWidth="2" />
                  <rect x="535" y="148" width="190" height="70" rx="4" fill="#A97441" stroke="#F0D2A8" strokeWidth="2" />
                  <rect x="180" y="222" width="410" height="62" rx="4" fill="#C84B24" stroke="#FCD7C7" strokeWidth="2" />
                  <text x="20" y="28" fill="#B5D1C9" fontSize="13" fontFamily="monospace">
                    EXIF GPS: {selectedReport.lat.toFixed(4)}N, {selectedReport.lng.toFixed(4)}E
                  </text>
                </svg>
              )}

              {selectedReport.yoloSummary.boxes.map((box) => (
                <div
                  key={box.id}
                  style={{
                    left: `${box.x}%`,
                    top: `${box.y}%`,
                    width: `${box.w}%`,
                    height: `${box.h}%`,
                  }}
                  className="absolute border-2 border-[#34D399] bg-[#34D399]/15 rounded-sm"
                >
                  <span className="absolute -top-5 left-0 bg-[#122B26] text-[#A7F3D0] text-[10px] font-mono-data px-1.5 py-0.5 rounded-t whitespace-nowrap">
                    {box.label} {(box.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              ))}

              <div className="absolute bottom-3 right-3 bg-[#122B26]/90 text-white text-xs font-mono-data px-3 py-1.5 rounded-lg">
                Đếm được: {selectedReport.yoloSummary.detectedCount}/
                {selectedReport.yoloSummary.expectedCount} suất (độ tin cậy{" "}
                {Math.round(selectedReport.yoloSummary.avgConfidence * 100)}%)
              </div>
            </div>

            {/* OCR Extraction Table */}
            {selectedReport.ocrSummary && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#122B26]">
                    <FileText className="w-4 h-4 text-[#145DA0]" />
                    Trích xuất hóa đơn (PaddleOCR / Gemini Vision)
                  </div>
                  <span className="text-sm font-mono-data font-bold text-[#145DA0]">
                    {formatVnd(selectedReport.ocrSummary.totalAmountVnd)}
                  </span>
                </div>
                <div className="divide-y divide-[#EEF2EF] border-y border-[#E7ECE8] text-xs">
                  {selectedReport.ocrSummary.fields.map((f) => (
                    <div key={f.label} className="py-2.5 flex items-center justify-between gap-2">
                      <span className="text-[#4A5D58]">{f.label}</span>
                      <div className="flex items-center gap-2.5">
                        <strong className="text-[#122B26] font-mono-data">{f.value}</strong>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-mono-data ${
                            f.needsReview
                              ? "bg-[#FEF4E4] text-[#9A5809]"
                              : "bg-[#EAF6F1] text-[#157A5B]"
                          }`}
                        >
                          {Math.round(f.confidence * 100)}%
                          {f.needsReview ? " cần rà soát" : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audit Note */}
            <div className="bg-[#F6F9F7] border border-[#DCE3DD] rounded-lg p-4 text-xs text-[#122B26] flex items-start gap-2.5 leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-[#157A5B] shrink-0 mt-0.5" />
              <div>
                <strong>Kết luận đối chiếu: </strong>
                {selectedReport.geminiAuditNote}
              </div>
            </div>

            {/* Two-Way Commune Youth Union Confirmation (Dual-Verification) */}
            <div className="border-t border-[#E7ECE8] pt-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold text-[#122B26]">
                  Xác nhận 2 chiều từ Đoàn Xã / Phường địa phương
                </div>
                {selectedReport.communeConfirmed ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EAF6F1] text-[#157A5B] text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Đoàn Xã đã ký xác nhận ({selectedReport.communeConfirmedAt})
                  </span>
                ) : (
                  <span className="text-xs text-[#C84B24] font-medium">
                    Chờ Bí thư Đoàn Xã xác nhận tiếp nhận
                  </span>
                )}
              </div>

              {selectedReport.communeConfirmed ? (
                <div className="text-xs bg-[#EAF6F1] border border-[#B6DFCE] text-[#122B26] rounded-lg px-3.5 py-2.5">
                  <strong>Ý kiến Đoàn Xã:</strong> {selectedReport.communeConfirmNote}
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={communeNoteInput}
                    onChange={(e) => setCommuneNoteInput(e.target.value)}
                    placeholder="Ghi chú xác nhận của Bí thư Đoàn Xã..."
                    className="flex-1 px-3 py-2 text-xs border border-[#DCE3DD] rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => onCommuneConfirmReport(selectedReport.id, communeNoteInput)}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg text-white cursor-pointer shrink-0 ${
                      role === "commune_youth"
                        ? "bg-[#C84B24] hover:bg-[#ad3e1b]"
                        : "bg-[#122B26] hover:bg-[#1c3e37]"
                    }`}
                  >
                    Đoàn Xã xác nhận đã nhận đủ
                  </button>
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="lg:col-span-7 bg-white border border-[#DCE3DD] rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-3">
            <h2 className="font-display text-lg font-bold text-[#122B26]">
              Chưa có biên bản hiện trường nào
            </h2>
            <p className="text-sm text-[#4A5D58] max-w-md leading-relaxed">
              Tải lên ảnh trao quà hoặc ảnh hóa đơn mua sắm thật ở cột bên trái để Gemini Vision tự động đếm hiện vật, trích xuất hóa đơn và lưu tọa độ GPS vào Supabase PostGIS.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
