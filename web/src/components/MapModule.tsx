"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Compass,
  Handshake,
  MapPin,
  Plus,
  Route,
  SlidersHorizontal,
  WifiOff,
  X,
} from "lucide-react";
import { formatCoords, formatVnd } from "@/lib/format";
import {
  EcosystemOrganization,
  PriorityLevel,
  UnitCommitment,
  UserRole,
  VillagePoint,
} from "@/types/volunteer-pulse";

const InteractiveMap = dynamic(() => import("./InteractiveMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[600px] bg-[#E5ECE8] flex items-center justify-center text-sm text-[#4A5D58]">
      Đang tải bản đồ địa hình Quảng Nam và Đà Nẵng...
    </div>
  ),
});

const DISTRICT_COORDS: Record<string, { lat: number; lng: number; km: number }> = {
  "Nam Trà My": { lat: 15.042, lng: 108.045, km: 138 },
  "Tây Giang": { lat: 15.814, lng: 107.347, km: 128 },
  "Đông Giang": { lat: 15.928, lng: 107.692, km: 78 },
  "Phước Sơn": { lat: 15.325, lng: 107.768, km: 118 },
  "Bắc Trà My": { lat: 15.274, lng: 108.221, km: 102 },
  "Hòa Vang (Đà Nẵng)": { lat: 16.126, lng: 107.945, km: 42 },
};

interface MapModuleProps {
  role: UserRole;
  villages: VillagePoint[];
  commitments: UnitCommitment[];
  communeOrgs: EcosystemOrganization[];
  routeCoordinates: Array<{ lat: number; lng: number; name: string; order: number }>;
  onAddVillage: (village: VillagePoint) => void;
  onJumpToEcosystem: () => void;
}

export default function MapModule({
  role,
  villages,
  commitments,
  communeOrgs,
  routeCoordinates,
  onAddVillage,
  onJumpToEcosystem,
}: MapModuleProps) {
  const [selectedId, setSelectedId] = useState<string>(villages[0]?.id ?? "");
  const [filterMode, setFilterMode] = useState<"all" | "unclaimed" | PriorityLevel>("all");
  const [showRoute, setShowRoute] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Commune Needs Request form
  const [newName, setNewName] = useState("");
  const [communeOrgName, setCommuneOrgName] = useState("");
  const [communeLeader, setCommuneLeader] = useState("");
  const [newDistrict, setNewDistrict] = useState("Nam Trà My");
  const [newLat, setNewLat] = useState(15.042);
  const [newLng, setNewLng] = useState(108.045);
  const [newHouseholds, setNewHouseholds] = useState(45);
  const [newChildren, setNewChildren] = useState(60);
  const [newDistance, setNewDistance] = useState(138);
  const [newPriority, setNewPriority] = useState<PriorityLevel>("urgent");
  const [newNotes, setNewNotes] = useState("");

  function handleDistrictChange(dist: string) {
    setNewDistrict(dist);
    const preset = DISTRICT_COORDS[dist];
    if (preset) {
      setNewLat(preset.lat);
      setNewLng(preset.lng);
      setNewDistance(preset.km);
    }
  }

  const filteredVillages = villages.filter((v) => {
    if (filterMode === "all") return true;
    if (filterMode === "unclaimed") {
      return commitments.filter((c) => c.villageId === v.id).length === 0 && v.coverageStatus !== "completed";
    }
    return v.priority === filterMode;
  });

  const selectedVillage =
    villages.find((v) => v.id === selectedId) ?? filteredVillages[0] ?? villages[0];

  const selectedCommitments = selectedVillage
    ? commitments.filter((c) => c.villageId === selectedVillage.id)
    : [];

  const totalHouseholds = villages.reduce((s, v) => s + v.households, 0);
  const unclaimedCount = villages.filter(
    (v) => commitments.filter((c) => c.villageId === v.id).length === 0 && v.coverageStatus !== "completed"
  ).length;

  function handleCreateVillage(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const created: VillagePoint = {
      id: `req-${Date.now().toString().slice(-6)}`,
      name: newName.trim(),
      commune: communeOrgName.trim() || newName.trim(),
      district: newDistrict,
      province: newDistrict.includes("Đà Nẵng") ? "Đà Nẵng" : "Quảng Nam",
      lat: Number(newLat),
      lng: Number(newLng),
      distanceKm: newDistance,
      households: newHouseholds,
      children: newChildren,
      difficultyScore: newPriority === "urgent" ? 9.2 : newPriority === "high" ? 7.8 : 5.2,
      priority: newPriority,
      terrainAlerts: ["Đường đất trơn trượt", "Mất sóng 4G"],
      has4G: false,
      needs: {
        giftBoxes: newHouseholds,
        warmCoats: newChildren,
        medicalKits: Math.max(10, Math.round(newHouseholds * 0.3)),
        riceKg: newHouseholds * 10,
      },
      requiredSkills: ["Hậu cần & Vận chuyển", "Y tế & Sơ cứu"],
      transportCostPerTrip: Math.round(newDistance * 38000),
      verifiedStatus: "planned",
      notes:
        newNotes.trim() ||
        "Phiếu đề xuất nhu cầu do Đoàn Xã/Phường gửi lên hệ sinh thái kết nối ĐH Duy Tân.",
      communeOrgName: communeOrgName.trim() || `Đoàn Xã (${newDistrict})`,
      communeLeader: communeLeader.trim() || "Bí thư Đoàn Xã",
      coverageStatus: "unclaimed",
    };
    onAddVillage(created);
    setSelectedId(created.id);
    setNewName("");
    setNewNotes("");
    setShowAddModal(false);
  }

  return (
    <div className="relative w-full h-[calc(100vh-56px)] lg:h-screen min-h-[640px] overflow-hidden">
      <InteractiveMap
        villages={filteredVillages}
        selectedVillageId={selectedVillage?.id ?? null}
        onSelectVillage={setSelectedId}
        routeCoordinates={routeCoordinates}
        showRoute={showRoute}
      />

      {/* Top-Left Floating Atlas Title & Filter Overlay */}
      <div className="absolute top-4 left-4 right-4 lg:right-[424px] z-[500] pointer-events-none flex flex-col gap-2.5">
        <div className="pointer-events-auto bg-white/94 backdrop-blur-md border border-[#DCE3DD] rounded-xl shadow-[0_12px_32px_rgba(18,43,38,0.10)] px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 max-w-3xl">
          <div>
            <h1 className="font-display text-lg sm:text-xl font-bold text-[#122B26] leading-snug">
              Bản đồ Nhu cầu Đoàn Xã và Kết nối ĐH Duy Tân
            </h1>
            <p className="text-xs text-[#4A5D58] mt-0.5">
              {villages.length} phiếu nhu cầu ({totalHouseholds} hộ dân),{" "}
              <strong className="text-[#C84B24]">{unclaimedCount} vùng trắng chưa có đơn vị nhận</strong>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                role === "commune_youth"
                  ? "bg-[#C84B24] text-white hover:bg-[#ad3e1b]"
                  : "bg-[#145DA0] text-white hover:bg-[#104c84]"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Gửi phiếu nhu cầu Xã
            </button>
            <button
              onClick={onJumpToEcosystem}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-[#DCE3DD] bg-white text-[#122B26] hover:bg-[#F2F4F0] transition-colors cursor-pointer"
            >
              <Handshake className="w-3.5 h-3.5 text-[#145DA0]" />
              Nhận hỗ trợ
            </button>
          </div>
        </div>

        {/* Floating Filter Pills */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
          {(
            [
              ["all", "Tất cả"],
              ["unclaimed", `Vùng trắng chưa ai nhận (${unclaimedCount})`],
              ["urgent", "Khẩn cấp"],
              ["high", "Ưu tiên cao"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilterMode(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border shadow-sm transition-colors cursor-pointer ${
                filterMode === key
                  ? key === "unclaimed"
                    ? "bg-[#C84B24] text-white border-[#C84B24]"
                    : "bg-[#122B26] text-white border-[#122B26]"
                  : "bg-white/94 text-[#122B26] border-[#DCE3DD] hover:bg-white"
              }`}
            >
              {label}
            </button>
          ))}

          <button
            onClick={() => setShowRoute((s) => !s)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border shadow-sm transition-colors cursor-pointer ${
              showRoute
                ? "bg-[#EAF2FA] text-[#145DA0] border-[#B6D1EB]"
                : "bg-white/94 text-[#4A5D58] border-[#DCE3DD]"
            }`}
          >
            <Route className="w-3.5 h-3.5" />
            {showRoute ? "Đang hiện tuyến gom xe" : "Hiện tuyến gom xe"}
          </button>
        </div>
      </div>

      {/* Bottom-Left Compact Legend */}
      <div className="hidden sm:flex absolute bottom-4 left-16 z-[500] bg-white/94 backdrop-blur-md border border-[#DCE3DD] rounded-full px-4 py-1.5 shadow-sm items-center gap-4 text-xs text-[#4A5D58]">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#C84B24]" /> Khẩn cấp
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#B4690E]" /> Ưu tiên cao
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#157A5B]" /> Trung bình
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 border-t-2 border-dashed border-[#145DA0]" /> Tuyến gom OR-Tools
        </span>
      </div>

      {/* Right Floating Field Dossier Drawer */}
      <aside className="hidden lg:flex flex-col absolute top-4 right-4 bottom-4 w-[392px] z-[500] bg-white/96 backdrop-blur-md border border-[#DCE3DD] rounded-xl shadow-[0_16px_44px_rgba(18,43,38,0.12)] overflow-hidden">
        {selectedVillage ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div className="space-y-2 pb-4 border-b border-[#E7ECE8]">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                    selectedVillage.coverageStatus === "completed"
                      ? "bg-[#EAF6F1] text-[#157A5B]"
                      : selectedCommitments.length > 0
                        ? "bg-[#EAF2FA] text-[#145DA0]"
                        : "bg-[#FDF1EC] text-[#B33D18]"
                  }`}
                >
                  {selectedVillage.coverageStatus === "completed"
                    ? "Đã hoàn thành 2 chiều"
                    : selectedCommitments.length > 0
                      ? `Đã có ${selectedCommitments.length} đơn vị ĐH Duy Tân nhận`
                      : "Chưa có đơn vị nào nhận"}
                </span>

                {selectedVillage.verifiedStatus === "verified" && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[#157A5B]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Đã xác thực GPS
                  </span>
                )}
              </div>

              <h2 className="font-display text-xl font-bold text-[#122B26] leading-snug">
                {selectedVillage.name}
              </h2>
              <p className="text-xs text-[#4A5D58]">
                {selectedVillage.communeOrgName
                  ? `Đoàn Xã đề xuất: ${selectedVillage.communeOrgName} — `
                  : ""}
                Huyện {selectedVillage.district}, cách ĐH Duy Tân{" "}
                <strong className="font-mono-data text-[#122B26]">
                  {selectedVillage.distanceKm} km
                </strong>
              </p>
            </div>

            {/* Committing DTU Units */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#122B26] flex items-center justify-between">
                <span>Đơn vị Đoàn ĐH Duy Tân phụ trách</span>
                <button
                  onClick={onJumpToEcosystem}
                  className="text-[#145DA0] hover:underline cursor-pointer"
                >
                  Nhận / Liên quân
                </button>
              </div>
              {selectedCommitments.length === 0 ? (
                <div className="text-xs bg-[#FDF5F2] border border-[#F0D4C9] text-[#9E3513] rounded-lg px-3 py-2">
                  Chưa có LCĐ nào đăng ký. Bấm <strong>Nhận / Liên quân</strong> để nhận hỗ trợ địa phương này.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {selectedCommitments.map((c) => (
                    <div
                      key={c.id}
                      className="text-xs bg-[#F2F7FB] border border-[#CFE0F0] rounded-lg px-3 py-2 flex items-center justify-between"
                    >
                      <strong className="text-[#122B26] truncate">{c.dtuOrgName}</strong>
                      <span className="font-mono-data text-[#157A5B] shrink-0 ml-2">
                        {formatVnd(c.pledgedBudgetVnd)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* GPS & Connectivity */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-[#4A5D58] flex items-center gap-1 mb-1">
                  <Compass className="w-3.5 h-3.5 text-[#145DA0]" /> Tọa độ thực địa
                </div>
                <div className="font-mono-data font-medium text-[#122B26]">
                  {formatCoords(selectedVillage.lat, selectedVillage.lng)}
                </div>
              </div>
              <div>
                <div className="text-[#4A5D58] flex items-center gap-1 mb-1">
                  <WifiOff className="w-3.5 h-3.5 text-[#C84B24]" /> Sóng di động
                </div>
                <div className="font-medium text-[#122B26]">
                  {selectedVillage.has4G ? "Có sóng 4G ổn định" : "Mất sóng 4G, dùng Offline"}
                </div>
              </div>
            </div>

            {/* Terrain Alerts */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#122B26] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[#C84B24]" /> Cảnh báo địa hình
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedVillage.terrainAlerts.map((alert) => (
                  <span
                    key={alert}
                    className="px-2.5 py-1 text-xs rounded-md bg-[#FDF5F2] text-[#9E3513] border border-[#F0D4C9]"
                  >
                    {alert}
                  </span>
                ))}
              </div>
            </div>

            {/* Surveyed Needs */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#122B26]">
                Nhu cầu địa phương ({selectedVillage.households} hộ, {selectedVillage.children} trẻ em)
              </div>
              <div className="divide-y divide-[#EEF2EF] border-y border-[#E7ECE8] text-xs">
                <div className="py-2 flex justify-between">
                  <span className="text-[#4A5D58]">Suất quà hộ gia đình</span>
                  <strong className="font-mono-data text-[#122B26]">
                    {selectedVillage.needs.giftBoxes} suất
                  </strong>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-[#4A5D58]">Áo ấm trẻ em</span>
                  <strong className="font-mono-data text-[#122B26]">
                    {selectedVillage.needs.warmCoats} chiếc
                  </strong>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-[#4A5D58]">Túi y tế sơ cứu</span>
                  <strong className="font-mono-data text-[#122B26]">
                    {selectedVillage.needs.medicalKits} túi
                  </strong>
                </div>
              </div>
            </div>

            <p className="text-xs text-[#4A5D58] leading-relaxed">{selectedVillage.notes}</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#F2F4F0] flex items-center justify-center text-[#145DA0]">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <h2 className="font-display text-lg font-bold text-[#122B26]">
                Chưa có phiếu nhu cầu nào
              </h2>
              <p className="text-xs text-[#4A5D58] leading-relaxed">
                Cơ sở dữ liệu Supabase PostGIS đang trống. Đoàn Xã/Phường có thể gửi phiếu đề xuất nhu cầu đầu tiên để các đơn vị Đoàn ĐH Duy Tân kết nối.
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#145DA0] text-white hover:bg-[#104c84] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Gửi phiếu nhu cầu đầu tiên
            </button>
          </div>
        )}

        {/* Bottom Switcher */}
        <div className="border-t border-[#E7ECE8] bg-[#F8FAF8] p-3.5">
          <div className="text-xs font-semibold text-[#122B26] mb-2 flex items-center justify-between">
            <span>Phiếu nhu cầu địa phương</span>
            <span className="font-mono-data text-[#4A5D58]">{filteredVillages.length} điểm</span>
          </div>
          <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
            {filteredVillages.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedId(v.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                  v.id === selectedVillage?.id
                    ? "bg-[#122B26] text-white font-medium"
                    : "text-[#122B26] hover:bg-[#EAEFEA]"
                }`}
              >
                <span className="inline-flex items-center gap-2 truncate">
                  <MapPin className="w-3.5 h-3.5 shrink-0 opacity-75" />
                  <span className="truncate">{v.name}</span>
                </span>
                <span className="font-mono-data opacity-80 shrink-0 ml-2">
                  {v.distanceKm} km
                </span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Modal: Commune Youth Union Needs Request */}
      {showAddModal && (
        <div className="fixed inset-0 z-[1000] bg-[#122B26]/45 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateVillage}
            className="bg-white border border-[#DCE3DD] rounded-xl shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#E7ECE8] pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#C84B24]" />
                <h3 className="font-display text-lg font-bold text-[#122B26]">
                  Phiếu Đề xuất Nhu cầu từ Đoàn Xã / Phường
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-[#4A5D58] hover:text-[#122B26] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-[#4A5D58] mb-1">
                  Đoàn Xã / Phường gửi đề xuất
                </label>
                {communeOrgs.length > 0 ? (
                  <select
                    value={communeOrgName}
                    onChange={(e) => setCommuneOrgName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#DCE3DD] rounded-lg bg-white"
                  >
                    <option value="">-- Nhập tự do hoặc chọn --</option>
                    {communeOrgs.map((o) => (
                      <option key={o.id} value={o.name}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={communeOrgName}
                    onChange={(e) => setCommuneOrgName(e.target.value)}
                    placeholder="VD: Đoàn Xã Trà Linh"
                    className="w-full px-3 py-2 text-sm border border-[#DCE3DD] rounded-lg"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4A5D58] mb-1">
                  Bí thư Đoàn Xã / Người phụ trách
                </label>
                <input
                  type="text"
                  value={communeLeader}
                  onChange={(e) => setCommuneLeader(e.target.value)}
                  placeholder="VD: Anh Hồ Văn A"
                  className="w-full px-3 py-2 text-sm border border-[#DCE3DD] rounded-lg"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#4A5D58] mb-1">
                  Tên thôn / điểm trường cần hỗ trợ
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="VD: Thôn 3, Xã Trà Linh hoặc Điểm trường Tắk Pỏ"
                  className="w-full px-3 py-2 text-sm border border-[#DCE3DD] rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4A5D58] mb-1">Huyện</label>
                <select
                  value={newDistrict}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#DCE3DD] rounded-lg bg-white"
                >
                  {Object.keys(DISTRICT_COORDS).map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4A5D58] mb-1">Mức khẩn cấp</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as PriorityLevel)}
                  className="w-full px-3 py-2 text-sm border border-[#DCE3DD] rounded-lg bg-white"
                >
                  <option value="urgent">Khẩn cấp</option>
                  <option value="high">Ưu tiên cao</option>
                  <option value="medium">Trung bình</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4A5D58] mb-1">Vĩ độ (Lat)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={newLat}
                  onChange={(e) => setNewLat(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-[#DCE3DD] rounded-lg font-mono-data"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4A5D58] mb-1">Kinh độ (Lng)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={newLng}
                  onChange={(e) => setNewLng(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-[#DCE3DD] rounded-lg font-mono-data"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4A5D58] mb-1">Số hộ dân</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={newHouseholds}
                  onChange={(e) => setNewHouseholds(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-[#DCE3DD] rounded-lg font-mono-data"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4A5D58] mb-1">Số trẻ em</label>
                <input
                  type="number"
                  min={0}
                  max={500}
                  value={newChildren}
                  onChange={(e) => setNewChildren(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-[#DCE3DD] rounded-lg font-mono-data"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#4A5D58] mb-1">
                  Mô tả nhu cầu thực tế & lưu ý đường đi
                </label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Ví dụ: Cần áo ấm cho học sinh tiểu học, khám bệnh cơ bản, đường vào thôn có đoạn đất trơn trượt..."
                  className="w-full px-3 py-2 text-sm border border-[#DCE3DD] rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#EEF2EF]">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-medium border border-[#DCE3DD] rounded-lg cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-[#145DA0] text-white rounded-lg hover:bg-[#104c84] cursor-pointer"
              >
                Gửi phiếu nhu cầu lên Supabase
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
