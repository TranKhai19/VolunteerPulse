import { describe, expect, it } from "vitest";
import { INITIAL_VILLAGES, INITIAL_VOLUNTEERS } from "@/data/mock-campaign";
import { runBudgetOptimization } from "@/lib/optimizer";
import { matchVolunteersToVillages } from "@/lib/matcher";

describe("VolunteerPulse OR-Tools Budget & Route Optimizer", () => {
  it("never exceeds total budget and caps village coverage at 100% (no oversupply)", () => {
    const result = runBudgetOptimization(INITIAL_VILLAGES, {
      totalBudgetVnd: 200_000_000,
      giftBoxUnitCost: 300_000,
      warmCoatUnitCost: 150_000,
      medicalKitUnitCost: 160_000,
      fairnessWeight: 0.8,
      selectedVillageIds: INITIAL_VILLAGES.map((v) => v.id),
    });

    expect(result.allocations).toHaveLength(INITIAL_VILLAGES.length);
    expect(result.summary.totalAllocatedVnd).toBeLessThanOrEqual(200_000_000);
    for (const alloc of result.allocations) {
      expect(alloc.coveragePercent).toBeLessThanOrEqual(100);
    }
  });

  it("improves fairness index over naive manual allocation and saves convoy logistics cost", () => {
    const result = runBudgetOptimization(INITIAL_VILLAGES, {
      totalBudgetVnd: 165_000_000,
      giftBoxUnitCost: 300_000,
      warmCoatUnitCost: 150_000,
      medicalKitUnitCost: 160_000,
      fairnessWeight: 0.85,
      selectedVillageIds: INITIAL_VILLAGES.map((v) => v.id),
    });

    expect(result.summary.aiFairnessIndex).toBeGreaterThan(result.summary.manualFairnessIndex);
    expect(result.summary.logisticsSavedVnd).toBeGreaterThan(0);
    expect(result.agentTrace).toHaveLength(3);
  });
});

describe("VolunteerPulse BGE-M3 Smart Volunteer Matching", () => {
  it("assigns every volunteer with valid cosine similarity and balanced village coverage", () => {
    const matches = matchVolunteersToVillages(INITIAL_VOLUNTEERS, INITIAL_VILLAGES);
    expect(matches).toHaveLength(INITIAL_VOLUNTEERS.length);

    const uniqueVillagesCovered = new Set(matches.map((m) => m.villageId));
    expect(uniqueVillagesCovered.size).toBeGreaterThanOrEqual(5);

    for (const m of matches) {
      expect(m.cosineSimilarity).toBeGreaterThan(0.5);
      expect(m.matchScore).toBeGreaterThanOrEqual(72);
      expect(m.reasons.length).toBeGreaterThan(0);
    }
  });
});
