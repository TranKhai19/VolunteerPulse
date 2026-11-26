const DEFAULT_MODEL = "gemini-2.5-flash";

export function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY?.trim() || "";
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  return {
    apiKey,
    model,
    isConfigured: apiKey.length > 10,
  };
}

interface GeminiJsonRequest {
  systemPrompt: string;
  userPrompt: string;
  imageBase64?: string;
  mimeType?: string;
  temperature?: number;
}

export async function callGeminiJson<T>({
  systemPrompt,
  userPrompt,
  imageBase64,
  mimeType,
  temperature = 0.2,
}: GeminiJsonRequest): Promise<{ data: T; model: string }> {
  const { apiKey, model, isConfigured } = getGeminiConfig();
  if (!isConfigured) {
    throw new Error("GEMINI_API_KEY_MISSING");
  }

  const parts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [{ text: userPrompt }];

  if (imageBase64 && mimeType) {
    // Strip data URL prefix if present
    const cleanBase64 = imageBase64.includes(",")
      ? imageBase64.split(",")[1]
      : imageBase64;
    parts.push({
      inlineData: {
        mimeType,
        data: cleanBase64,
      },
    });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`GEMINI_HTTP_${res.status}: ${errText.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error("GEMINI_EMPTY_RESPONSE");
  }

  // Strip optional markdown code fences just in case
  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  const parsed = JSON.parse(cleaned) as T;
  return { data: parsed, model };
}
