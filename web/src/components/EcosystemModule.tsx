"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Handshake,
  MapPin,
  Plus,
  Users,
} from "lucide-react";
import { formatVnd } from "@/lib/format";
import {
  EcosystemOrganization,
  SkillCategory,
  UnitCommitment,
  UserRole,
  VillagePoint,
} from "@/types/volunteer-pulse";

const ALL_SKILLS: SkillCategory[] = [
  "Y tế & Sơ cứu",
  "Hậu cần & Vận chuyển",
  "Truyền thông & Ghi hình",
  "Dạy học & Sinh hoạt thiếu nhi",
  "Lái xe địa hình",
  "Kỹ thuật & Điện mặt trời",
];

interface EcosystemModuleProps {
  role: UserRole;
  organizations: EcosystemOrganization[];
  villages: VillagePoint[];
  commitments: UnitCommitment[];
  onAddOrganization: (org: EcosystemOrganization) => void;
  onAddCommitment: (commitment: UnitCommitment, nextCoverageStatus: "co_op_needed" | "claimed") => void;
  onJumpToMap: () => void;
}

export default function EcosystemModule({
  role,
  organizations,
  villages,
  commitments,
  onAddOrganization,
  onAddCommitment,
  onJumpToMap,
}: EcosystemModuleProps) {
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [orgType, setOrgType] = useState<"commune_youth" | "dtu_unit">(
    role === "commune_youth" ? "commune_youth" : "dtu_unit"
  );
  const [orgName, setOrgName] = useState("");
  const [district, setDistrict] = useState("Nam Trà My");
  const [leaderName, setLeaderName] = useState("");
  const [phoneMasked, setPhoneMasked] = useState("");
  const [orgSkills, setOrgSkills] = useState<SkillCategory[]>(["Hậu cần & Vận chuyển"]);

  // Commitment modal / inline panel
  const [claimingVillageId, setClaimingVillageId] = useState<string | null>(null);
  const [dtuOrgNameInput, setDtuOrgNameInput] = useState("");
  const [commitmentType, setCommitmentType] = useState<"full" | "partial" | "co_op">("full");
  const [pledgedBudget, setPledgedBudget] = useState(25_000_000);
  const [pledgedSkills, setPledgedSkills] = useState<SkillCategory[]>(["Hậu cần & Vận chuyển"]);
  const [commitNote, setCommitNote] = useState("");

  const communeOrgs = organizations.filter((o) => o.orgType === "commune_youth");
  const dtuOrgs = organizations.filter((o) => o.orgType === "dtu_unit");

  const unclaimedVillages = villages.filter((v) => {
    const vc = commitments.filter((c) => c.villageId === v.id);
    return vc.length === 0 && v.coverageStatus !== "completed";
  });

  function toggleSkill(
    list: SkillCategory[],
    setter: (next: SkillCategory[]) => void,
    sk: SkillCategory
  ) {
    setter(
      list.includes(sk)
        ? list.length > 1
          ? list.filter((x) => x !== sk)
          : list
        : [...list, sk]
    );
  }

  function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!orgName.trim()) return;
    onAddOrganization({
      id: `org-${Date.now().toString().slice(-5)}`,
      name: orgName.trim(),
      orgType,
      district: orgType === "commune_youth" ? district : "Hải Châu",
      province: orgType === "commune_youth" ? "Quảng Nam" : "Đà Nẵng",
      leaderName: leaderName.trim() || "Chưa cập nhật",
      phoneMasked: phoneMasked.trim() || "0905 *** ***",
      strengths: orgSkills,
    });
    setOrgName("");
    setLeaderName("");
    setPhoneMasked("");
    setShowOrgForm(false);
  }

  function handleSubmitCommitment(e: React.FormEvent) {
    e.preventDefault();
    if (!claimingVillageId) return;
    const chosenName = dtuOrgNameInput.trim() || dtuOrgs[0]?.name || "LCĐ Khoa ĐH Duy Tân";
    const matchedOrg = dtuOrgs.find((o) => o.name === chosenName);

    const existingForVillage = commitments.filter((c) => c.villageId === claimingVillageId);
    const nextStatus: "co_op_needed" | "claimed" =
      commitmentType === "full" || existingForVillage.length >= 1 ? "claimed" : "co_op_needed";

    onAddCommitment(
      {
        id: `com-${Date.now().toString().slice(-5)}`,
        villageId: claimingVillageId,
        dtuOrgId: matchedOrg?.id || "",
        dtuOrgName: chosenName,
        commitmentType,
        pledgedBudgetVnd: pledgedBudget,
        pledgedSkills,
        status: "active",
        note: commitNote.trim() || "Cam kết phối hợp cùng Đoàn Xã triển khai chiến dịch.",
      },
      nextStatus
    );

    setClaimingVillageId(null);
    setCommitNote("");
  }

  return (
    <div className="space-y-8">
      {/* Editorial Masthead */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-[#DCE3DD]">
        <div className="max-w-2xl">
          <h1 className="font-display text-2xl sm:text-[28px] font-bold text-[#122B26] leading-tight">
            Hệ sinh thái kết nối Đoàn Xã và Đơn vị Đoàn ĐH Duy Tân
          </h1>
          <p className="mt-1.5 text-sm text-[#4A5D58] leading-relaxed">
            Các Đoàn Xã/Phường vùng khó khăn chủ động gửi phiếu nhu cầu; các Liên Chi Đoàn Khoa và CLB tại Đại học Duy Tân nhận phụ trách hoặc ghép liên quân để không xã nào bị bỏ sót.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowOrgForm((s) => !s)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#145DA0] text-white hover:bg-[#104c84] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Đăng ký Đơn vị Đoàn / Đoàn Xã
          </button>
          <button
            onClick={onJumpToMap}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-[#DCE3DD] bg-white text-[#122B26] hover:bg-[#F5F8F6] cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-[#C84B24]" />
            Mở bản đồ vùng trắng
          </button>
        </div>
      </div>

      {/* Two-Sided Onboarding Flow Strip when DB is fresh */}
      {organizations.length === 0 && villages.length === 0 && (
        <div className="bg-white border border-[#DCE2DC] rounded-xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <div className="text-xs font-mono-data font-semibold text-[#C24620]">Bước 1</div>
            <h2 className="font-display text-base font-bold text-[#102824]">
              Đoàn Xã gửi phiếu nhu cầu
            </h2>
            <p className="text-xs text-[#4A5D58] leading-relaxed">
              Đăng ký Đoàn Xã/Phường vùng khó khăn và gửi phiếu nhu cầu kèm tọa độ GPS thực tế trên bản đồ.
            </p>
          </div>
          <div className="space-y-1.5 md:border-l md:border-[#EAEEEA] md:pl-6">
            <div className="text-xs font-mono-data font-semibold text-[#145DA0]">Bước 2</div>
            <h2 className="font-display text-base font-bold text-[#102824]">
              LCĐ ĐH Duy Tân nhận hỗ trợ
            </h2>
            <p className="text-xs text-[#4A5D58] leading-relaxed">
              Các Liên Chi Đoàn chọn xã vùng trắng để nhận phụ trách chính hoặc ghép liên quân nhiều khoa.
            </p>
          </div>
          <div className="space-y-1.5 md:border-l md:border-[#EAEEEA] md:pl-6">
            <div className="text-xs font-mono-data font-semibold text-[#157A5B]">Bước 3</div>
            <h2 className="font-display text-base font-bold text-[#102824]">
              Xác thực 2 chiều và minh bạch
            </h2>
            <p className="text-xs text-[#4A5D58] leading-relaxed">
              Đoàn ĐH Duy Tân gửi ảnh trao quà và hóa đơn OCR, Bí thư Đoàn Xã ký xác nhận tiếp nhận đủ.
            </p>
          </div>
        </div>
      )}

      {/* Anti-Overlap Radar Banner */}
      {unclaimedVillages.length > 0 && (
        <div className="bg-[#FDF4F0] border border-[#ECC3B4] rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#C84B24] shrink-0 mt-0.5" />
            <div className="text-sm text-[#7A2A10]">
              <strong>Cảnh báo vùng trắng chưa có đơn vị nhận:</strong> Hiện có{" "}
              <strong className="font-mono-data">{unclaimedVillages.length}</strong> phiếu nhu cầu từ Đoàn Xã chưa có Liên Chi Đoàn nào tại ĐH Duy Tân đăng ký hỗ trợ.
            </div>
          </div>
        </div>
      )}

      {/* Register Organization Form */}
      {showOrgForm && (
        <form
          onSubmit={handleCreateOrg}
          className="bg-white border border-[#145DA0] rounded-xl p-6 space-y-5 shadow-sm"
        >
          <div className="font-display text-lg font-bold text-[#122B26]">
            Đăng ký tổ chức tham gia hệ sinh thái
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#4A5D58] mb-1">Phân loại đơn vị</label>
              <select
                value={orgType}
                onChange={(e) => setOrgType(e.target.value as "commune_youth" | "dtu_unit")}
                className="w-full px-3 py-2 text-sm border border-[#DCE3DD] rounded-lg bg-white"
              >
                <option value="commune_youth">Đoàn Xã / Phường vùng khó khăn</option>
                <option value="dtu_unit">Đơn vị Đoàn ĐH Duy Tân (LCĐ / CLB)</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[#4A5D58] mb-1">
                Tên đơn vị
              </label>
              <input
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder={
                  orgType === "commune_youth"
                    ? "Ví dụ: Đoàn Xã Trà Linh, Nam Trà My"
                    : "Ví dụ: LCĐ Khoa Khoa học Máy tính — ĐH Duy Tân"
                }
                className="w-full px-3 py-2 text-sm border border-[#DCE3DD] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4A5D58] mb-1">
                {orgType === "commune_youth" ? "Huyện / Địa bàn" : "Đơn vị trực thuộc"}
              </label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="Nam Trà My / ĐH Duy Tân"
                className="w-full px-3 py-2 text-sm border border-[#DCE3DD] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4A5D58] mb-1">
                Bí thư / Người đại diện
              </label>
              <input
                type="text"
                required
                value={leaderName}
                onChange={(e) => setLeaderName(e.target.value)}
                placeholder="Họ và tên đại diện"
                className="w-full px-3 py-2 text-sm border border-[#DCE3DD] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4A5D58] mb-1">
                Số điện thoại (ẩn bớt khi công khai)
              </label>
              <input
                type="text"
                value={phoneMasked}
                onChange={(e) => setPhoneMasked(e.target.value)}
                placeholder="0905 *** 123"
                className="w-full px-3 py-2 text-sm border border-[#DCE3DD] rounded-lg font-mono-data"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[#4A5D58] mb-1">
                {orgType === "commune_youth" ? "Nhóm nhu cầu chính" : "Thế mạnh của LCĐ / CLB"}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_SKILLS.map((sk) => {
                  const active = orgSkills.includes(sk);
                  return (
                    <button
                      key={sk}
                      type="button"
                      onClick={() => toggleSkill(orgSkills, setOrgSkills, sk)}
                      className={`px-2.5 py-1 text-xs rounded-full border cursor-pointer ${
                        active
                          ? "bg-[#122B26] text-white border-[#122B26]"
                          : "bg-white text-[#122B26] border-[#DCE3DD]"
                      }`}
                    >
                      {sk}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#EEF2EF]">
            <button
              type="button"
              onClick={() => setShowOrgForm(false)}
              className="px-4 py-2 text-xs font-medium border border-[#DCE3DD] rounded-lg cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-[#145DA0] text-white rounded-lg hover:bg-[#104c84] cursor-pointer"
            >
              Lưu vào Supabase
            </button>
          </div>
        </form>
      )}

      {/* Two-Sided Directory Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-[#DCE3DD] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E7ECE8] pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#C84B24]" />
              <h2 className="font-display text-lg font-bold text-[#122B26]">
                Đoàn Xã / Phường vùng khó khăn
              </h2>
            </div>
            <span className="text-xs font-mono-data text-[#4A5D58]">{communeOrgs.length} đơn vị</span>
          </div>
          {communeOrgs.length === 0 ? (
            <p className="text-xs text-[#4A5D58] py-4">
              Chưa có Đoàn Xã/Phường nào đăng ký. Bấm <strong>Đăng ký Đơn vị Đoàn / Đoàn Xã</strong> để thêm dữ liệu thật.
            </p>
          ) : (
            <div className="divide-y divide-[#EEF2EF]">
              {communeOrgs.map((o) => (
                <div key={o.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                  <div>
                    <div className="font-semibold text-[#122B26] text-sm">{o.name}</div>
                    <div className="text-[#4A5D58] mt-0.5">
                      Bí thư/Đại diện: {o.leaderName} ({o.district}, {o.province})
                    </div>
                  </div>
                  <span className="font-mono-data text-[#4A5D58] shrink-0">{o.phoneMasked}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white border border-[#DCE3DD] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E7ECE8] pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#145DA0]" />
              <h2 className="font-display text-lg font-bold text-[#122B26]">
                Các đơn vị Đoàn tại Đại học Duy Tân
              </h2>
            </div>
            <span className="text-xs font-mono-data text-[#4A5D58]">{dtuOrgs.length} LCĐ / CLB</span>
          </div>
          {dtuOrgs.length === 0 ? (
            <p className="text-xs text-[#4A5D58] py-4">
              Chưa có Liên Chi Đoàn / CLB nào đăng ký. Bấm <strong>Đăng ký Đơn vị Đoàn / Đoàn Xã</strong> để thêm các đơn vị ĐH Duy Tân.
            </p>
          ) : (
            <div className="divide-y divide-[#EEF2EF]">
              {dtuOrgs.map((o) => (
                <div key={o.id} className="py-3 space-y-1.5 text-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-[#122B26] text-sm">{o.name}</div>
                      <div className="text-[#4A5D58]">Đại diện: {o.leaderName}</div>
                    </div>
                    <span className="font-mono-data text-[#4A5D58]">{o.phoneMasked}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {o.strengths.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 rounded-full bg-[#F2F7FB] text-[#145DA0] text-[11px]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Live Needs Matching & Co-op Commitment Board */}
      <section className="bg-white border border-[#DCE3DD] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E7ECE8] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Handshake className="w-4 h-4 text-[#145DA0]" />
            <h2 className="font-display text-lg font-bold text-[#122B26]">
              Sàn kết nối Phiếu nhu cầu & Nhận hỗ trợ liên quân
            </h2>
          </div>
          <span className="text-xs text-[#4A5D58]">
            {villages.length} phiếu nhu cầu từ Đoàn Xã, {commitments.length} cam kết hỗ trợ
          </span>
        </div>

        {villages.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-sm font-medium text-[#122B26]">
              Chưa có phiếu nhu cầu nào từ các Đoàn Xã/Phường.
            </p>
            <p className="text-xs text-[#4A5D58]">
              Chuyển sang tab <strong>Bản đồ chiến dịch</strong> và bấm <strong>Thêm điểm bản / Gửi phiếu nhu cầu</strong> để bắt đầu kết nối.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#EEF2EF]">
            {villages.map((v) => {
              const vCommitments = commitments.filter((c) => c.villageId === v.id);
              const isClaimedFull =
                v.coverageStatus === "claimed" ||
                v.coverageStatus === "completed" ||
                vCommitments.some((c) => c.commitmentType === "full");

              return (
                <div key={v.id} className="p-5 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-base font-bold text-[#122B26]">
                          {v.name}
                        </h3>
                        <span
                          className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${
                            v.coverageStatus === "completed"
                              ? "bg-[#EAF6F1] text-[#157A5B]"
                              : isClaimedFull
                                ? "bg-[#EAF2FA] text-[#145DA0]"
                                : vCommitments.length > 0
                                  ? "bg-[#FEF4E4] text-[#9A5809]"
                                  : "bg-[#FDF1EC] text-[#B33D18]"
                          }`}
                        >
                          {v.coverageStatus === "completed"
                            ? "Đã hoàn thành & Xã xác nhận"
                            : isClaimedFull
                              ? "Đã có đơn vị nhận đủ"
                              : vCommitments.length > 0
                                ? "Đang tìm LCĐ ghép liên quân"
                                : "Chưa có đơn vị nào nhận"}
                        </span>
                      </div>
                      <div className="text-xs text-[#4A5D58]">
                        {v.communeOrgName ? `Đề xuất bởi ${v.communeOrgName} — ` : ""}
                        Huyện {v.district}, {v.households} hộ dân, {v.children} trẻ em ({v.distanceKm} km)
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setClaimingVillageId(v.id);
                        setDtuOrgNameInput(dtuOrgs[0]?.name || "");
                        setCommitmentType(vCommitments.length > 0 ? "co_op" : "full");
                      }}
                      className={`px-3.5 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
                        isClaimedFull
                          ? "border border-[#DCE3DD] bg-white text-[#4A5D58] hover:bg-[#F5F8F6]"
                          : "bg-[#145DA0] text-white hover:bg-[#104c84]"
                      }`}
                    >
                      {isClaimedFull
                        ? "Ghép thêm nguồn lực bổ sung"
                        : vCommitments.length > 0
                          ? "Tham gia liên quân LCĐ"
                          : "Nhận hỗ trợ điểm bản này"}
                    </button>
                  </div>

                  {/* Anti-Overlap Notice if already claimed */}
                  {isClaimedFull && claimingVillageId === v.id && (
                    <div className="text-xs bg-[#FEF4E4] border border-[#F0D5A8] text-[#8A4F08] rounded-lg px-3.5 py-2.5">
                      <strong>Cảnh báo chống chồng chéo:</strong> Điểm bản này đã có đơn vị nhận phụ trách chính. Bạn nên ưu tiên các xã vùng trắng hoặc chỉ đăng ký bổ sung kỹ năng chuyên môn còn thiếu (ví dụ Y tế / Kỹ thuật).
                    </div>
                  )}

                  {/* Active Commitments List */}
                  {vCommitments.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {vCommitments.map((c) => (
                        <div
                          key={c.id}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F2F7FB] border border-[#CFE0F0] text-xs text-[#122B26]"
                        >
                          <Users className="w-3.5 h-3.5 text-[#145DA0]" />
                          <strong>{c.dtuOrgName}</strong>
                          <span className="font-mono-data text-[#157A5B]">
                            {formatVnd(c.pledgedBudgetVnd)}
                          </span>
                          <span className="text-[#4A5D58]">
                            ({c.commitmentType === "full" ? "Phụ trách chính" : "Liên quân"})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inline Commitment Form */}
                  {claimingVillageId === v.id && (
                    <form
                      onSubmit={handleSubmitCommitment}
                      className="mt-3 bg-[#F8FAF8] border border-[#145DA0] rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
                    >
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-[#4A5D58] mb-1">
                          Đơn vị Đoàn ĐH Duy Tân cam kết
                        </label>
                        {dtuOrgs.length > 0 ? (
                          <select
                            value={dtuOrgNameInput}
                            onChange={(e) => setDtuOrgNameInput(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-[#DCE3DD] rounded-lg bg-white"
                          >
                            {dtuOrgs.map((o) => (
                              <option key={o.id} value={o.name}>
                                {o.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            required
                            value={dtuOrgNameInput}
                            onChange={(e) => setDtuOrgNameInput(e.target.value)}
                            placeholder="VD: LCĐ Khoa KHMT — ĐH Duy Tân"
                            className="w-full px-3 py-2 text-xs border border-[#DCE3DD] rounded-lg bg-white"
                          />
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#4A5D58] mb-1">
                          Hình thức
                        </label>
                        <select
                          value={commitmentType}
                          onChange={(e) =>
                            setCommitmentType(e.target.value as "full" | "partial" | "co_op")
                          }
                          className="w-full px-3 py-2 text-xs border border-[#DCE3DD] rounded-lg bg-white"
                        >
                          <option value="full">Nhận phụ trách chính (100%)</option>
                          <option value="co_op">Ghép liên quân cùng LCĐ khác</option>
                          <option value="partial">Hỗ trợ một phần hiện vật/kỹ năng</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#4A5D58] mb-1">
                          Ngân sách dự kiến (VNĐ)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={500000}
                          value={pledgedBudget}
                          onChange={(e) => setPledgedBudget(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs border border-[#DCE3DD] rounded-lg bg-white font-mono-data"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-xs font-medium text-[#4A5D58] mb-1">
                          Ghi chú phối hợp với Đoàn Xã
                        </label>
                        <input
                          type="text"
                          value={commitNote}
                          onChange={(e) => setCommitNote(e.target.value)}
                          placeholder="Ví dụ: Dự kiến khởi hành cuối tuần, cần Đoàn Xã hỗ trợ danh sách hộ dân"
                          className="w-full px-3 py-2 text-xs border border-[#DCE3DD] rounded-lg bg-white"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold bg-[#157A5B] text-white rounded-lg hover:bg-[#116349] cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Xác nhận
                        </button>
                        <button
                          type="button"
                          onClick={() => setClaimingVillageId(null)}
                          className="px-3 py-2 text-xs border border-[#DCE3DD] rounded-lg bg-white cursor-pointer"
                        >
                          Hủy
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
