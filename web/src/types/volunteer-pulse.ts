export type UserRole = "commune_youth" | "dtu_unit" | "coordinator";

export type AuthRole = "pending" | "volunteer" | "dtu_unit" | "commune_youth" | "coordinator" | "admin";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: AuthRole;
  orgName: string;
  approved: boolean;
  createdAt?: string;
}

export interface Campaign {
  id: string;
  name: string;
  year: number;
  province: string;
  status: "planning" | "active" | "completed" | "archived";
  isDefault: boolean;
}

export type PriorityLevel = "urgent" | "high" | "medium";

export type CoverageStatus = "unclaimed" | "co_op_needed" | "claimed" | "completed";

export type TerrainAlert =
  | "Sạt lở nhẹ"
  | "Đường đất trơn trượt"
  | "Mất sóng 4G"
  | "Ngầm tràn suối"
  | "Đèo dốc sương mù"
  | "Đường bê tông thuận lợi";

export type SkillCategory =
  | "Y tế & Sơ cứu"
  | "Hậu cần & Vận chuyển"
  | "Truyền thông & Ghi hình"
  | "Dạy học & Sinh hoạt thiếu nhi"
  | "Lái xe địa hình"
  | "Kỹ thuật & Điện mặt trời";

export interface EcosystemOrganization {
  id: string;
  name: string;
  orgType: "commune_youth" | "dtu_unit";
  district: string;
  province: string;
  leaderName: string;
  phoneMasked: string;
  strengths: SkillCategory[];
}

export interface UnitCommitment {
  id: string;
  villageId: string;
  dtuOrgId: string;
  dtuOrgName: string;
  commitmentType: "full" | "partial" | "co_op";
  pledgedBudgetVnd: number;
  pledgedSkills: SkillCategory[];
  status: "active" | "completed";
  note: string;
}

export interface VillagePoint {
  id: string;
  name: string;
  commune: string;
  district: string;
  province: string;
  lat: number;
  lng: number;
  distanceKm: number;
  households: number;
  children: number;
  difficultyScore: number; // 1 to 10
  priority: PriorityLevel;
  terrainAlerts: TerrainAlert[];
  has4G: boolean;
  needs: {
    giftBoxes: number;
    warmCoats: number;
    medicalKits: number;
    riceKg: number;
  };
  requiredSkills: SkillCategory[];
  transportCostPerTrip: number;
  verifiedStatus: "verified" | "in_progress" | "planned";
  notes: string;
  // Ecosystem two-sided fields
  communeOrgId?: string;
  communeOrgName?: string;
  communeLeader?: string;
  coverageStatus?: CoverageStatus;
}

export interface OptimizationConfig {
  totalBudgetVnd: number;
  giftBoxUnitCost: number;
  warmCoatUnitCost: number;
  medicalKitUnitCost: number;
  fairnessWeight: number;
  selectedVillageIds: string[];
}

export interface VillageAllocation {
  villageId: string;
  villageName: string;
  district: string;
  priority: PriorityLevel;
  difficultyScore: number;
  households: number;
  children: number;
  allocatedGiftBoxes: number;
  allocatedWarmCoats: number;
  allocatedMedicalKits: number;
  supplyBudgetVnd: number;
  transportBudgetVnd: number;
  totalBudgetVnd: number;
  coveragePercent: number;
  manualBaselineCoveragePercent: number;
  routeOrder: number;
}

export interface AgentTraceStep {
  agent: string;
  tool: string;
  status: "done";
  durationMs: number;
  summary: string;
}

export interface OptimizationResult {
  allocations: VillageAllocation[];
  summary: {
    totalAllocatedVnd: number;
    remainingBudgetVnd: number;
    totalGiftBoxes: number;
    totalWarmCoats: number;
    totalMedicalKits: number;
    aiFairnessIndex: number;
    manualFairnessIndex: number;
    logisticsSavedVnd: number;
    totalRouteKm: number;
    planningTimeMinutes: number;
  };
  routeCoordinates: Array<{ lat: number; lng: number; name: string; order: number }>;
  agentTrace: AgentTraceStep[];
  aiExplanation: string;
}

export interface Volunteer {
  id: string;
  fullName: string;
  studentId: string;
  faculty: string;
  phoneMasked: string;
  skills: SkillCategory[];
  highlandTrips: number;
  availability: string;
  bio: string;
  hasDrivingLicense: boolean;
}

export interface VolunteerMatch {
  volunteer: Volunteer;
  villageId: string;
  villageName: string;
  assignedRole: SkillCategory;
  matchScore: number;
  cosineSimilarity: number;
  reasons: string[];
}

export interface YoloDetectionBox {
  id: string;
  label: string;
  confidence: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface OcrField {
  label: string;
  value: string;
  confidence: number;
  needsReview: boolean;
}

export interface FieldVerificationReport {
  id: string;
  villageId: string;
  villageName: string;
  volunteerName: string;
  dtuOrgName?: string;
  timestamp: string;
  lat: number;
  lng: number;
  gpsAccuracyMeters: number;
  exifVerified: boolean;
  syncStatus: "synced" | "queued_offline";
  leaderApproved: boolean;
  // Two-way confirmation by Commune Youth Union
  communeConfirmed?: boolean;
  communeConfirmNote?: string;
  communeConfirmedAt?: string;
  imageUrl?: string;
  gpsSource?: "device_gps" | "village_fallback";
  campaignId?: string;
  photoType: "delivery" | "receipt";
  sampleScene: "tra_linh_gifts" | "tak_po_coats" | "invoice_supplies";
  yoloSummary: {
    detectedCount: number;
    expectedCount: number;
    itemLabel: string;
    avgConfidence: number;
    boxes: YoloDetectionBox[];
  };
  ocrSummary?: {
    vendor: string;
    date: string;
    totalAmountVnd: number;
    fields: OcrField[];
  };
  geminiAuditNote: string;
}

export interface DonorTransaction {
  id: string;
  donorName: string;
  type: "inflow" | "outflow";
  amountVnd: number;
  date: string;
  villageName?: string;
  description: string;
  verifiedReceiptId?: string;
}
