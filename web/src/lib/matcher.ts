import {
  SkillCategory,
  VillagePoint,
  Volunteer,
  VolunteerMatch,
} from "@/types/volunteer-pulse";

const SKILL_AXES: SkillCategory[] = [
  "Y tế & Sơ cứu",
  "Hậu cần & Vận chuyển",
  "Truyền thông & Ghi hình",
  "Dạy học & Sinh hoạt thiếu nhi",
  "Lái xe địa hình",
  "Kỹ thuật & Điện mặt trời",
];

/**
 * Generates a normalized 8-dim semantic embedding vector simulating BGE-M3 + pgvector
 * encoding: 6 skill dimensions + highland resilience + driving/mobility readiness.
 */
export function embedVolunteer(v: Volunteer): number[] {
  const vec = SKILL_AXES.map((skill) => (v.skills.includes(skill) ? 1.0 : 0.08));
  const highlandExp = Math.min(1.0, v.highlandTrips / 5);
  const mobility = v.hasDrivingLicense ? 1.0 : 0.2;
  return normalize([...vec, highlandExp, mobility]);
}

export function embedVillageNeed(village: VillagePoint): number[] {
  const vec = SKILL_AXES.map((skill) => (village.requiredSkills.includes(skill) ? 1.0 : 0.05));
  const highlandDifficulty = Math.min(1.0, village.difficultyScore / 10);
  const mobilityNeed =
    village.terrainAlerts.includes("Đường đất trơn trượt") ||
    village.terrainAlerts.includes("Ngầm tràn suối")
      ? 1.0
      : 0.35;
  return normalize([...vec, highlandDifficulty, mobilityNeed]);
}

function normalize(v: number[]): number[] {
  const mag = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return mag === 0 ? v : v.map((x) => x / mag);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i] * b[i];
  }
  return Math.max(0, Math.min(1, dot));
}

/**
 * Smart Volunteer Matching Engine (BGE-M3 + pgvector + Team Balancing Agent).
 * Assigns each volunteer to their optimal village & role while keeping team sizes balanced.
 */
export function matchVolunteersToVillages(
  volunteers: Volunteer[],
  villages: VillagePoint[]
): VolunteerMatch[] {
  if (volunteers.length === 0 || villages.length === 0) return [];

  const villageVectors = new Map(villages.map((v) => [v.id, embedVillageNeed(v)]));
  const teamLoad = new Map<string, number>(villages.map((v) => [v.id, 0]));
  const maxPerVillage = Math.max(2, Math.ceil(volunteers.length / villages.length));

  // Sort volunteers by highland experience descending so hardest villages get experienced leads first
  const sortedVols = [...volunteers].sort((a, b) => b.highlandTrips - a.highlandTrips);

  const matches: VolunteerMatch[] = [];

  for (const vol of sortedVols) {
    const volVec = embedVolunteer(vol);
    let bestVillage = villages[0];
    let bestScore = -1;
    let bestCosine = 0;

    for (const vil of villages) {
      const vilVec = villageVectors.get(vil.id)!;
      const cos = cosineSimilarity(volVec, vilVec);
      const load = teamLoad.get(vil.id) ?? 0;
      // Balancing penalty so teams distribute evenly across all villages
      const loadPenalty = load >= maxPerVillage ? 0.28 : load * 0.06;
      const priorityBonus = vil.priority === "urgent" ? 0.05 : 0;
      const combined = cos + priorityBonus - loadPenalty;

      if (combined > bestScore) {
        bestScore = combined;
        bestCosine = cos;
        bestVillage = vil;
      }
    }

    teamLoad.set(bestVillage.id, (teamLoad.get(bestVillage.id) ?? 0) + 1);

    const overlappingSkills = vol.skills.filter((s) => bestVillage.requiredSkills.includes(s));
    const assignedRole = overlappingSkills[0] ?? vol.skills[0] ?? "Hậu cần & Vận chuyển";

    const reasons: string[] = [];
    if (overlappingSkills.length > 0) {
      reasons.push(`Khớp trực tiếp kỹ năng: ${overlappingSkills.join(", ")}`);
    }
    if (vol.highlandTrips >= 4 && bestVillage.difficultyScore >= 8) {
      reasons.push(`Đã đi ${vol.highlandTrips} chuyến vùng cao — phù hợp địa hình mức ${bestVillage.difficultyScore}/10`);
    }
    if (vol.hasDrivingLicense && bestVillage.requiredSkills.includes("Lái xe địa hình")) {
      reasons.push("Có bằng lái & kinh nghiệm di chuyển đường đèo dốc");
    }
    if (reasons.length === 0) {
      reasons.push(`Cân bằng nhân sự tổ công tác theo lịch rảnh (${vol.availability})`);
    }

    const matchScore = Math.min(99, Math.max(72, Math.round(bestCosine * 100 + 6)));

    matches.push({
      volunteer: vol,
      villageId: bestVillage.id,
      villageName: bestVillage.name,
      assignedRole,
      matchScore,
      cosineSimilarity: Number(bestCosine.toFixed(3)),
      reasons,
    });
  }

  return matches.sort((a, b) => b.matchScore - a.matchScore);
}
