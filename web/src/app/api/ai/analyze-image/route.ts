import { NextResponse } from "next/server";
import { callGeminiJson, getGeminiConfig } from "@/lib/gemini";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { OcrField, YoloDetectionBox } from "@/types/volunteer-pulse";

interface VisionDeliveryResult {
  detectedCount: number;
  itemLabel: string;
  avgConfidence: number;
  boxes: YoloDetectionBox[];
  auditNote: string;
}

interface VisionReceiptResult {
  vendor: string;
  date: string;
  totalAmountVnd: number;
  fields: OcrField[];
  auditNote: string;
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`ai-vision:${ip}`, 15, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { mode: "fallback", error: `Quá giới hạn gọi AI. Thử lại sau ${rl.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  try {
    const body = (await request.json()) as {
      imageBase64?: string;
      mimeType?: string;
      photoType: "delivery" | "receipt";
      villageName: string;
      expectedCount: number;
    };

    if (body.imageBase64 && body.imageBase64.length > 8_000_000) {
      return NextResponse.json(
        { mode: "fallback", error: "Ảnh vượt quá giới hạn 6MB." },
        { status: 413 }
      );
    }

    const { isConfigured, model } = getGeminiConfig();
    if (!isConfigured || !body.imageBase64 || !body.mimeType) {
      return NextResponse.json({
        mode: "fallback",
        model,
        reason: !isConfigured ? "NO_API_KEY" : "NO_IMAGE_UPLOADED",
      });
    }

    if (body.photoType === "receipt") {
      const { data, model: usedModel } = await callGeminiJson<VisionReceiptResult>({
        systemPrompt:
          'Bạn là hệ thống OCR & kiểm toán hóa đơn thiện nguyện VolunteerPulse. Trích xuất thông tin thật từ ảnh hóa đơn tải lên và trả về JSON đúng cấu trúc: { "vendor": string, "date": string, "totalAmountVnd": number, "fields": [{ "label": string, "value": string, "confidence": number (0..1), "needsReview": boolean }], "auditNote": string }. Nếu trường nào mờ/khó đọc thì đặt confidence < 0.9 và needsReview = true. Chỉ trả JSON hợp lệ bằng tiếng Việt.',
        userPrompt: `Hãy trích xuất hóa đơn chi tiêu cho điểm bản ${body.villageName}. Nếu ảnh không phải hóa đơn, hãy ghi rõ trong auditNote và đặt needsReview = true.`,
        imageBase64: body.imageBase64,
        mimeType: body.mimeType,
      });

      return NextResponse.json({
        mode: "live",
        model: usedModel,
        photoType: "receipt",
        ocrSummary: {
          vendor: data.vendor || "Chưa rõ đơn vị bán",
          date: data.date || "Không rõ ngày",
          totalAmountVnd: Number(data.totalAmountVnd) || 0,
          fields: Array.isArray(data.fields) ? data.fields : [],
        },
        geminiAuditNote:
          data.auditNote ||
          "Đã trích xuất hóa đơn trực tiếp bằng Gemini Vision API. Vui lòng Trưởng đoàn rà soát và duyệt chéo.",
      });
    }

    // Delivery photo counting + bounding boxes
    const { data, model: usedModel } = await callGeminiJson<VisionDeliveryResult>({
      systemPrompt:
        'Bạn là hệ thống thị giác máy tính kiểm đếm hiện vật thiện nguyện VolunteerPulse. Quan sát ảnh hiện trường được tải lên, ước lượng số lượng thùng quà/túi quà/vật phẩm cứu trợ nhìn thấy và trả về JSON đúng cấu trúc: { "detectedCount": number, "itemLabel": string, "avgConfidence": number (0..1), "boxes": [{ "id": string, "label": string, "confidence": number, "x": number (0..90), "y": number (0..90), "w": number (5..90), "h": number (5..90) }], "auditNote": string }. Tọa độ x,y,w,h là phần trăm khung ảnh. Trả lời bằng tiếng Việt.',
      userPrompt: `Hãy kiểm đếm thùng quà / hiện vật trong ảnh bàn giao tại ${body.villageName} (định mức dự kiến: ${body.expectedCount} suất) và nhận xét ngắn gọn độ khớp trong auditNote.`,
      imageBase64: body.imageBase64,
      mimeType: body.mimeType,
    });

    return NextResponse.json({
      mode: "live",
      model: usedModel,
      photoType: "delivery",
      yoloSummary: {
        detectedCount: Number(data.detectedCount) || 0,
        expectedCount: body.expectedCount,
        itemLabel: data.itemLabel || "vat_pham_thien_nguyen",
        avgConfidence: Number(data.avgConfidence) || 0.88,
        boxes: Array.isArray(data.boxes) ? data.boxes.slice(0, 8) : [],
      },
      geminiAuditNote:
        data.auditNote ||
        "Đã phân tích ảnh hiện trường trực tiếp bằng Gemini Vision API.",
    });
  } catch (err) {
    return NextResponse.json({
      mode: "fallback",
      error: err instanceof Error ? err.message : "AI_VISION_ERROR",
    });
  }
}
