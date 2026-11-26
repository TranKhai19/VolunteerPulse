import { NextResponse } from "next/server";
import { callGeminiJson, getGeminiConfig } from "@/lib/gemini";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { OptimizationConfig, OptimizationResult } from "@/types/volunteer-pulse";

interface ExplainResponse {
  explanation: string;
  fieldAdvice: string;
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`ai-explain:${ip}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { mode: "fallback", error: `Quá giới hạn gọi AI. Thử lại sau ${rl.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  try {
    const body = (await request.json()) as {
      config: OptimizationConfig;
      result: OptimizationResult;
    };

    const { isConfigured, model } = getGeminiConfig();
    if (!isConfigured) {
      return NextResponse.json({
        mode: "fallback",
        model,
        explanation: body.result.aiExplanation,
        fieldAdvice:
          "Thêm GEMINI_API_KEY vào file web/.env.local để bật phân tích trực tiếp từ Gemini API.",
      });
    }

    const compactSummary = {
      totalBudgetVnd: body.config.totalBudgetVnd,
      fairnessWeight: body.config.fairnessWeight,
      summary: body.result.summary,
      allocations: body.result.allocations.map((a) => ({
        village: a.villageName,
        district: a.district,
        priority: a.priority,
        difficulty: a.difficultyScore,
        giftBoxes: `${a.allocatedGiftBoxes}/${a.households}`,
        warmCoats: `${a.allocatedWarmCoats}/${a.children}`,
        coveragePercent: a.coveragePercent,
        manualCoveragePercent: a.manualBaselineCoveragePercent,
        routeOrder: a.routeOrder,
      })),
    };

    const { data, model: usedModel } = await callGeminiJson<ExplainResponse>({
      systemPrompt:
        "Bạn là Transparency Explainer Agent của hệ thống tình nguyện vùng cao VolunteerPulse (Đoàn Đại học Duy Tân). Hãy phân tích số liệu phân bổ từ bộ giải Google OR-Tools và trả về JSON với đúng 2 trường tiếng Việt ngắn gọn, súc tích: { \"explanation\": \"...\", \"fieldAdvice\": \"...\" }. Không bịa thêm số liệu ngoài JSON đầu vào.",
      userPrompt: `Hãy phân tích phương án phân bổ sau và đưa ra 1 lời khuyên hậu cần/địa hình ngắn gọn cho Trưởng đoàn:\n${JSON.stringify(
        compactSummary
      )}`,
    });

    return NextResponse.json({
      mode: "live",
      model: usedModel,
      explanation: data.explanation || body.result.aiExplanation,
      fieldAdvice: data.fieldAdvice || "",
    });
  } catch (err) {
    return NextResponse.json(
      {
        mode: "fallback",
        error: err instanceof Error ? err.message : "AI_ERROR",
      },
      { status: 200 }
    );
  }
}
