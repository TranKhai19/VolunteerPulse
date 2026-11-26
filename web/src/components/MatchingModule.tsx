"use client";

import { useMemo, useState } from "react";
import { Check, ShieldCheck, UserPlus } from "lucide-react";
import { matchVolunteersToVillages } from "@/lib/matcher";
import { SkillCategory, VillagePoint, Volunteer } from "@/types/volunteer-pulse";

const ALL_SKILLS: SkillCategory[] = [
  "Y tế & Sơ cứu",
  "Hậu cần & Vận chuyển",
  "Truyền thông & Ghi hình",
  "Dạy học & Sinh hoạt thiếu nhi",
  "Lái xe địa hình",
  "Kỹ thuật & Điện mặt trời",
];

interface MatchingModuleProps {
  volunteers: Volunteer[];
  villages: VillagePoint[];
  onAddVolunteer: (vol: Volunteer) => void;
}

export default function MatchingModule({
  volunteers,
  villages,
  onAddVolunteer,
}: MatchingModuleProps) {
  const [villageFilter, setVillageFilter] = useState<string>("all");
  const [showRegister, setShowRegister] = useState<boolean>(false);

  const [fullName, setFullName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [faculty, setFaculty] = useState("LCĐ Khoa Khoa học Máy tính");
  const [highlandTrips, setHighlandTrips] = useState(2);
  const [selectedSkills, setSelectedSkills] = useState<SkillCategory[]>([
    "Hậu cần & Vận chuyển",
    "Y tế & Sơ cứu",
  ]);
  const [hasLicense, setHasLicense] = useState(true);
  const [recentAddedName, setRecentAddedName] = useState<string | null>(null);

  const matches = useMemo(
    () => matchVolunteersToVillages(volunteers, villages),
    [volunteers, villages]
  );

  const visibleMatches =
    villageFilter === "all"
      ? matches
      : matches.filter((m) => m.villageId === villageFilter);

  const avgScore = Math.round(
    matches.reduce((s, m) => s + m.matchScore, 0) / Math.max(1, matches.length)
  );

  function toggleSkill(skill: SkillCategory) {
    setSelectedSkills((prev) =>
      prev.includes(skill)
        ? prev.length > 1
          ? prev.filter((s) => s !== skill)
          : prev
        : [...prev, skill]
    );
  }

  function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return;
    const created: Volunteer = {
      id: `vol-new-${Date.now()}`,
      fullName: fullName.trim(),
      studentId: studentId.trim() || "32211900123",
      faculty,
      phoneMasked: "0905 *** 999",
      skills: selectedSkills,
      highlandTrips,
      availability: "18–22/01",
      bio: "Tình nguyện viên đăng ký trực tuyến, đã chuẩn hóa hồ sơ kỹ năng.",
      hasDrivingLicense: hasLicense,
    };
    onAddVolunteer(created);
    setRecentAddedName(created.fullName);
    setFullName("");
    setStudentId("");
    setShowRegister(false);
  }

  return (
    <div className="space-y-7">
      {/* Editorial Masthead */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-[#DCE3DD]">
        <div className="max-w-2xl">
          <h1 className="font-display text-2xl sm:text-[28px] font-bold text-[#122B26] leading-tight">
            Ghép nhân sự theo kỹ năng thực địa
          </h1>
          <p className="mt-1.5 text-sm text-[#4A5D58] leading-relaxed">
            Đối khớp vector kỹ năng BGE-M3 của {volunteers.length} tình nguyện viên với yêu cầu từng tổ công tác. Độ phù hợp trung bình đạt{" "}
            <strong className="font-mono-data text-[#157A5B]">{avgScore}%</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={villageFilter}
            onChange={(e) => setVillageFilter(e.target.value)}
            className="px-3.5 py-2 text-xs font-medium border border-[#DCE3DD] rounded-lg bg-white text-[#122B26]"
          >
            <option value="all">Tất cả điểm bản ({matches.length} người)</option>
            {villages.map((v) => {
              const count = matches.filter((m) => m.villageId === v.id).length;
              return (
                <option key={v.id} value={v.id}>
                  {v.name.split(",")[0]} ({count} người)
                </option>
              );
            })}
          </select>

          <button
            onClick={() => setShowRegister((s) => !s)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[#145DA0] text-white hover:bg-[#104c84] transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Đăng ký tình nguyện viên
          </button>
        </div>
      </div>

      {recentAddedName && (
        <div className="bg-[#EAF6F1] border border-[#B6DFCE] rounded-xl px-4 py-3 text-sm text-[#122B26] flex items-center justify-between">
          <span className="inline-flex items-center gap-2">
            <Check className="w-4 h-4 text-[#157A5B]" />
            Đã ghép tổ công tác tự động cho <strong>{recentAddedName}</strong> dựa trên hồ sơ kỹ năng.
          </span>
          <button
            onClick={() => setRecentAddedName(null)}
            className="text-xs font-semibold underline cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {showRegister && (
        <form
          onSubmit={handleRegister}
          className="bg-white border border-[#145DA0] rounded-xl p-6 space-y-5 shadow-sm"
        >
          <div className="font-display text-lg font-bold text-[#122B26]">
            Hồ sơ tình nguyện viên mới
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#4A5D58] mb-1">Họ và tên</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Minh Quân"
                className="w-full px-3 py-2 text-sm border border-[#DCE3DD] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4A5D58] mb-1">Mã số sinh viên</label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="32211..."
                className="w-full px-3 py-2 text-sm border border-[#DCE3DD] rounded-lg font-mono-data"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4A5D58] mb-1">Đơn vị / Khoa</label>
              <input
                type="text"
                value={faculty}
                onChange={(e) => setFaculty(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#DCE3DD] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4A5D58] mb-1">
                Số chuyến vùng cao đã đi
              </label>
              <input
                type="number"
                min={0}
                max={20}
                value={highlandTrips}
                onChange={(e) => setHighlandTrips(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-[#DCE3DD] rounded-lg font-mono-data"
              />
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-[#4A5D58] mb-2">
              Kỹ năng thế mạnh
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_SKILLS.map((sk) => {
                const active = selectedSkills.includes(sk);
                return (
                  <button
                    key={sk}
                    type="button"
                    onClick={() => toggleSkill(sk)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors cursor-pointer ${
                      active
                        ? "bg-[#122B26] text-white border-[#122B26]"
                        : "bg-white text-[#122B26] border-[#DCE3DD] hover:bg-[#F2F4F0]"
                    }`}
                  >
                    {sk}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#EEF2EF]">
            <label className="inline-flex items-center gap-2 text-xs text-[#122B26] cursor-pointer">
              <input
                type="checkbox"
                checked={hasLicense}
                onChange={(e) => setHasLicense(e.target.checked)}
                className="accent-[#145DA0]"
              />
              Có bằng lái và kinh nghiệm chạy đường đèo dốc
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowRegister(false)}
                className="px-4 py-2 text-xs font-medium border border-[#DCE3DD] rounded-lg cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-[#145DA0] text-white rounded-lg hover:bg-[#104c84] cursor-pointer"
              >
                Lưu và ghép đội
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Privacy Footnote */}
      <div className="flex items-center gap-2 text-xs text-[#4A5D58]">
        <ShieldCheck className="w-4 h-4 text-[#157A5B] shrink-0" />
        <span>
          Số điện thoại và CCCD được ẩn một phần trên giao diện công khai theo chính sách phân quyền dữ liệu Supabase RLS.
        </span>
      </div>

      {/* Volunteer Roster Table-Card Layout */}
      {visibleMatches.length === 0 ? (
        <div className="bg-white border border-[#DCE3DD] rounded-xl p-10 text-center space-y-3">
          <h2 className="font-display text-lg font-bold text-[#122B26]">
            {villages.length === 0
              ? "Chưa có điểm bản nào để ghép nhân sự"
              : "Chưa có tình nguyện viên nào được đăng ký"}
          </h2>
          <p className="text-sm text-[#4A5D58] max-w-md mx-auto">
            {villages.length === 0
              ? "Hãy thêm ít nhất một điểm bản ở tab Bản đồ chiến dịch, sau đó đăng ký tình nguyện viên để hệ thống tự động ghép tổ."
              : "Bấm nút Đăng ký tình nguyện viên ở góc trên để thêm hồ sơ thật vào cơ sở dữ liệu Supabase."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {visibleMatches.map((m) => (
          <article
            key={m.volunteer.id}
            className="bg-white border border-[#DCE3DD] rounded-xl p-5 flex flex-col justify-between gap-4"
          >
            <div className="space-y-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-bold text-[#122B26]">
                    {m.volunteer.fullName}
                  </h2>
                  <div className="text-xs text-[#4A5D58] mt-0.5">{m.volunteer.faculty}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-mono-data font-bold text-[#157A5B]">
                    {m.matchScore}%
                  </div>
                  <div className="text-[11px] font-mono-data text-[#7A8C87]">
                    cos {m.cosineSimilarity}
                  </div>
                </div>
              </div>

              {/* Assignment Strip */}
              <div className="border-y border-[#EEF2EF] py-2.5 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#4A5D58]">Điểm bản phân công</span>
                  <strong className="text-[#122B26]">{m.villageName.split(",")[0]}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4A5D58]">Vai trò đề xuất</span>
                  <strong className="text-[#145DA0]">{m.assignedRole}</strong>
                </div>
              </div>

              {/* Reasons */}
              <ul className="space-y-1 text-xs text-[#4A5D58] leading-relaxed list-disc pl-4">
                {m.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>

            <div className="pt-3 border-t border-[#EEF2EF] flex items-center justify-between text-xs text-[#6B7E79]">
              <span>{m.volunteer.highlandTrips} chuyến vùng cao</span>
              <span className="font-mono-data">{m.volunteer.phoneMasked}</span>
            </div>
          </article>
        ))}
        </div>
      )}
    </div>
  );
}
