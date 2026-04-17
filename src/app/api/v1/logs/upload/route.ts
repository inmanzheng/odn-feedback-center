import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth";
import { processUpload } from "@/lib/upload/process-upload";
import type { FeedbackPayload, UploadResponse } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/v1/logs/upload
 *
 * 接收 Feedback Skill 发送的 JSON 数据。
 *
 * Headers:
 *   Authorization: Bearer <API_SECRET_KEY>
 *   Content-Type: application/json
 *
 * Body: FeedbackPayload (见 src/types/index.ts)
 */
export async function POST(request: NextRequest) {
  // 1. 鉴权
  if (!validateApiKey(request)) {
    return NextResponse.json<UploadResponse>(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  // 2. 解析 JSON
  let payload: FeedbackPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json<UploadResponse>(
      { success: false, error: "Invalid JSON body" },
      { status: 422 }
    );
  }

  // 3. 基本校验
  if (!payload.meta?.projectName) {
    return NextResponse.json<UploadResponse>(
      { success: false, error: "meta.projectName is required" },
      { status: 422 }
    );
  }

  if (!payload.conversations || !Array.isArray(payload.conversations)) {
    return NextResponse.json<UploadResponse>(
      { success: false, error: "conversations array is required" },
      { status: 422 }
    );
  }

  // 4. 处理并存储
  try {
    const result = await processUpload(payload);
    return NextResponse.json<UploadResponse>({
      success: true,
      sessionId: result.sessionId,
      projectId: result.projectId,
      projectName: result.projectName,
      conversationCount: result.conversationCount,
      screenshotCount: result.screenshotCount,
    });
  } catch (err) {
    console.error("Upload processing error:", err);
    return NextResponse.json<UploadResponse>(
      { success: false, error: "Internal processing error" },
      { status: 500 }
    );
  }
}
