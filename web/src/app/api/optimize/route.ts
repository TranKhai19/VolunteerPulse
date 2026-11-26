import { NextResponse } from "next/server";
import { INITIAL_VILLAGES } from "@/data/mock-campaign";
import { runBudgetOptimization } from "@/lib/optimizer";
import { OptimizationConfig, VillagePoint } from "@/types/volunteer-pulse";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      villages?: VillagePoint[];
      config: OptimizationConfig;
    };
    const villages = body.villages && body.villages.length > 0 ? body.villages : INITIAL_VILLAGES;
    const result = runBudgetOptimization(villages, body.config);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Dữ liệu đầu vào không hợp lệ cho bộ tối ưu hóa OR-Tools." },
      { status: 400 }
    );
  }
}
