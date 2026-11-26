"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Play, Sparkles } from "lucide-react";
import { formatMillions, formatVnd } from "@/lib/format";
import {
  OptimizationConfig,
  OptimizationResult,
  VillagePoint,
} from "@/types/volunteer-pulse";

interface OptimizerModuleProps {
  villages: VillagePoint[];
  config: OptimizationConfig;
  result: OptimizationResult;
  onUpdateConfig: (next: OptimizationConfig) => void;
}

export default function OptimizerModule({
  villages,
  config,
  result,
  onUpdateConfig,
}: OptimizerModuleProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [liveExplanation, setLiveExplanation] = useState<{
    mode: "live" | "fallback";
    model?: string;
    explanation: string;
    fieldAdvice?: string;
  } | null>(null);

  async function requestGeminiAnalysis() {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/explain-optimization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, result }),
      });
      const data = await res.json();
      if (data.explanation) {
        setLiveExplanation({
          mode: data.mode === "live" ? "live" : "fallback",
          model: data.model,
          explanation: data.explanation,
          fieldAdvice: data.fieldAdvice,
        });
      }
    } catch {
      // keep fallback explanation
    } finally {
      setAiLoading(false);
    }
  }

  function triggerOptimize(nextConfig: OptimizationConfig) {
    setIsRunning(true);
    setTimeout(() => {
      onUpdateConfig(nextConfig);
      setIsRunning(false);
    }, 180);
  }

  function toggleVillage(id: string) {
    const exists = config.selectedVillageIds.includes(id);
    const nextIds = exists
      ? config.selectedVillageIds.filter((x) => x !== id)
      : [...config.selectedVillageIds, id];
    if (nextIds.length === 0) return;
    triggerOptimize({ ...config, selectedVillageIds: nextIds });
  }

  const chartData = result.allocations.map((a) => ({
    name: a.villageName.replace("Điểm trường ", "").split(",")[0],
    "Chia thủ công (%)": a.manualBaselineCoveragePercent,
    "Tối ưu OR-Tools (%)": a.coveragePercent,
  }));

  return (
    <div className="space-y-8">
      {/* Editorial Masthead */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-[#DCE3DD]">
        <div className="max-w-2xl">
          <h1 className="font-display text-2xl sm:text-[28px] font-bold text-[#122B26] leading-tight">
            Tối ưu phân bổ ngân sách và quà tặng
          </h1>
          <p className="mt-1.5 text-sm text-[#4A5D58] leading-relaxed">
            Cân đối nguồn lực giữa các điểm bản vùng sâu và điểm gần trục chính bằng bài toán tối ưu Google OR-Tools kết hợp gom tuyến vận chuyển.
          </p>
        </div>

        {/* Inline Key Summary Metrics (No Boxed SaaS Cards) */}
        <div className="flex flex-wrap items-center gap-7">
          <div>
            <div className="text-xs text-[#4A5D58]">Chỉ số công bằng</div>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono-data text-[#157A5B]">
                {result.summary.aiFairnessIndex}
              </span>
              <span className="text-xs font-mono-data text-[#7A8C87] line-through">
                {result.summary.manualFairnessIndex}
              </span>
            </div>
          </div>
          <div className="h-8 w-px bg-[#DCE3DD]" />
          <div>
            <div className="text-xs text-[#4A5D58]">Tiết kiệm vận chuyển</div>
            <div className="mt-0.5 text-2xl font-bold font-mono-data text-[#145DA0]">
              {formatMillions(result.summary.logisticsSavedVnd)}
            </div>
          </div>
          <div className="h-8 w-px bg-[#DCE3DD]" />
          <div>
            <div className="text-xs text-[#4A5D58]">Tổng lộ trình gom</div>
            <div className="mt-0.5 text-2xl font-bold font-mono-data text-[#122B26]">
              {result.summary.totalRouteKm} km
            </div>
          </div>
        </div>
      </div>

      {/* Asymmetric Split: Sticky Parameter Sheet (4 cols) + Analysis Canvas (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <section className="lg:col-span-4 bg-white border border-[#DCE3DD] rounded-xl p-6 space-y-6 lg:sticky lg:top-24">
          <div className="space-y-1">
            <h2 className="font-display text-lg font-bold text-[#122B26]">
              Tham số bài toán
            </h2>
            <p className="text-xs text-[#4A5D58]">
              Kéo thanh trượt để xem phương án chia quà cập nhật ngay lập tức.
            </p>
          </div>

          {/* Budget Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-[#122B26]">Ngân sách chiến dịch</span>
              <span className="font-mono-data font-semibold text-[#145DA0]">
                {formatVnd(config.totalBudgetVnd)}
              </span>
            </div>
            <input
              type="range"
              min={90_000_000}
              max={260_000_000}
              step={5_000_000}
              value={config.totalBudgetVnd}
              onChange={(e) =>
                triggerOptimize({ ...config, totalBudgetVnd: Number(e.target.value) })
              }
              className="w-full accent-[#145DA0] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-[#6B7E79] font-mono-data">
              <span>90 tr</span>
              <span>175 tr</span>
              <span>260 tr</span>
            </div>
          </div>

          {/* Fairness Weight Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-[#122B26]">Ưu tiên bản vùng sâu</span>
              <span className="font-mono-data font-semibold text-[#C84B24]">
                {Math.round(config.fairnessWeight * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={config.fairnessWeight}
              onChange={(e) =>
                triggerOptimize({ ...config, fairnessWeight: Number(e.target.value) })
              }
              className="w-full accent-[#C84B24] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-[#6B7E79]">
              <span>Tiết kiệm cước</span>
              <span>Cân bằng</span>
              <span>Công bằng tối đa</span>
            </div>
          </div>

          {/* Unit Costs Hairline List */}
          <div className="border-y border-[#E7ECE8] divide-y divide-[#EEF2EF] text-xs">
            <div className="py-2 flex justify-between">
              <span className="text-[#4A5D58]">Đơn giá suất quà hộ</span>
              <span className="font-mono-data font-medium">{formatVnd(config.giftBoxUnitCost)}</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-[#4A5D58]">Đơn giá áo ấm trẻ em</span>
              <span className="font-mono-data font-medium">{formatVnd(config.warmCoatUnitCost)}</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-[#4A5D58]">Đơn giá túi y tế</span>
              <span className="font-mono-data font-medium">{formatVnd(config.medicalKitUnitCost)}</span>
            </div>
          </div>

          {/* Village Checkboxes */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-[#122B26]">
              <span>Điểm bản tham gia</span>
              <span className="font-mono-data text-[#4A5D58]">
                {config.selectedVillageIds.length}/{villages.length}
              </span>
            </div>
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {villages.map((v) => {
                const checked = config.selectedVillageIds.includes(v.id);
                return (
                  <label
                    key={v.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                      checked
                        ? "bg-[#F2F7FB] border-[#BCD4EA] text-[#122B26]"
                        : "bg-white border-[#E7ECE8] text-[#6B7E79]"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2 truncate">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleVillage(v.id)}
                        className="accent-[#145DA0]"
                      />
                      <span className="truncate">{v.name.split(",")[0]}</span>
                    </span>
                    <span className="font-mono-data text-[11px] opacity-75">{v.distanceKm} km</span>
                  </label>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => triggerOptimize({ ...config })}
            disabled={isRunning}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#145DA0] hover:bg-[#104c84] text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
          >
            <Play className="w-4 h-4" />
            {isRunning ? "Đang giải bài toán..." : "Chạy tối ưu phân bổ"}
          </button>
        </section>

        {/* Right Analysis Canvas */}
        <div className="lg:col-span-8 space-y-6">
          {/* Chart Panel */}
          <section className="bg-white border border-[#DCE3DD] rounded-xl p-6">
            <div className="mb-4">
              <h2 className="font-display text-lg font-bold text-[#122B26]">
                So sánh tỷ lệ đáp ứng nhu cầu giữa hai phương án
              </h2>
              <p className="text-xs text-[#4A5D58] mt-0.5">
                Phương án tối ưu giới hạn tối đa 100% tại điểm gần đường lớn để bù đắp cho các bản sâu ở Nam Trà My và Tây Giang.
              </p>
            </div>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 12, left: -14, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7ECE8" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#4A5D58" }} axisLine={false} tickLine={false} />
                  <YAxis unit="%" domain={[0, 145]} tick={{ fontSize: 11, fill: "#6B7E79" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value) => [`${value ?? 0}%`, ""]}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #DCE3DD",
                      fontSize: "12px",
                      boxShadow: "0 8px 24px rgba(18,43,38,0.1)",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                  <Bar dataKey="Chia thủ công (%)" fill="#CBD5D0" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Tối ưu OR-Tools (%)" fill="#145DA0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Gemini Analysis & Agent Steps */}
          <section className="bg-[#F6F9F7] border border-[#DCE3DD] rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C84B24]" />
                <h3 className="font-display text-base font-bold text-[#122B26]">
                  Giải thích phương án từ Gemini AI
                </h3>
                {liveExplanation?.mode === "live" && (
                  <span className="px-2 py-0.5 rounded-full bg-[#EAF6F1] text-[#157A5B] text-[11px] font-mono-data font-medium">
                    Trực tiếp ({liveExplanation.model})
                  </span>
                )}
              </div>
              <button
                onClick={requestGeminiAnalysis}
                disabled={aiLoading}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#122B26] text-white hover:bg-[#1b3f38] transition-colors cursor-pointer disabled:opacity-60"
              >
                {aiLoading ? "Đang phân tích..." : "Phân tích bằng Gemini AI"}
              </button>
            </div>

            <p className="text-sm text-[#122B26] leading-relaxed max-w-[74ch]">
              {liveExplanation?.explanation || result.aiExplanation}
            </p>

            {liveExplanation?.fieldAdvice && (
              <div className="text-xs bg-white border border-[#DCE3DD] rounded-lg px-4 py-3 text-[#122B26]">
                <strong>Khuyến nghị thực địa:</strong> {liveExplanation.fieldAdvice}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              {result.agentTrace.map((step, idx) => (
                <div
                  key={step.agent}
                  className="bg-white border border-[#E2E8E3] rounded-lg p-3.5 text-xs space-y-1"
                >
                  <div className="font-semibold text-[#122B26]">
                    Bước {idx + 1}: {step.agent.replace(" Agent", "")}
                  </div>
                  <div className="text-[11px] font-mono-data text-[#145DA0]">
                    {step.durationMs} ms
                  </div>
                  <p className="text-[#4A5D58] leading-snug">{step.summary}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Clean Editorial Allocation Table */}
          <section className="bg-white border border-[#DCE3DD] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E7ECE8] flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-base font-bold text-[#122B26]">
                Bảng phân bổ chi tiết theo thứ tự gom tuyến
              </h3>
              <span className="text-xs font-mono-data text-[#4A5D58]">
                Tổng chi: {formatVnd(result.summary.totalAllocatedVnd)} (dự phòng{" "}
                {formatMillions(Math.max(0, result.summary.remainingBudgetVnd))})
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="text-[#4A5D58] border-b border-[#E7ECE8] bg-[#F8FAF8]">
                    <th className="py-3 px-4 font-semibold">Chặng</th>
                    <th className="py-3 px-4 font-semibold">Điểm bản</th>
                    <th className="py-3 px-4 font-semibold text-right">Suất quà</th>
                    <th className="py-3 px-4 font-semibold text-right">Áo ấm</th>
                    <th className="py-3 px-4 font-semibold text-right">Túi y tế</th>
                    <th className="py-3 px-4 font-semibold text-right">Tổng ngân sách</th>
                    <th className="py-3 px-4 font-semibold text-right">Đáp ứng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2EF]">
                  {result.allocations.map((a) => (
                    <tr key={a.villageId} className="hover:bg-[#F8FAF8]">
                      <td className="py-3 px-4 font-mono-data font-semibold text-[#145DA0]">
                        #{a.routeOrder}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#122B26]">{a.villageName}</div>
                        <div className="text-[11px] text-[#4A5D58]">
                          {a.district}, độ khó {a.difficultyScore}/10
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono-data">
                        {a.allocatedGiftBoxes}/{a.households}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-data">
                        {a.allocatedWarmCoats}/{a.children}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-data">
                        {a.allocatedMedicalKits}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-data font-semibold text-[#122B26]">
                        {formatVnd(a.totalBudgetVnd)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-block px-2.5 py-0.5 rounded-full font-mono-data font-semibold bg-[#EAF6F1] text-[#157A5B]">
                          {a.coveragePercent}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
