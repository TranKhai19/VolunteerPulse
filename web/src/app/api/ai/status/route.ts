import { NextResponse } from "next/server";
import { getGeminiConfig } from "@/lib/gemini";

export async function GET() {
  const { isConfigured, model } = getGeminiConfig();
  return NextResponse.json({
    live: isConfigured,
    model,
  });
}
