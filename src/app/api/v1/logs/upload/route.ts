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

  // 2. 检查 Content-Length（限制 10MB）
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > 10 * 1024 * 1024) {
    return NextResponse.json<UploadResponse>(
      { success: false, error: "Payload too large (max 10MB)" },
      { status: 413 }
    );
  }

  // 3. 解析 JSON
  let payload: FeedbackPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json<UploadResponse>(
      { success: false, error: "Invalid JSON body" },
      { status: 422 }
    );
  }

  // 4. 基本校验 - meta
  if (!payload.meta?.projectName || typeof payload.meta.projectName !== "string") {
    return NextResponse.json<UploadResponse>(
      { success: false, error: "meta.projectName is required and must be a string" },
      { status: 422 }
    );
  }

  if (!payload.meta.projectPath || typeof payload.meta.projectPath !== "string") {
    return NextResponse.json<UploadResponse>(
      { success: false, error: "meta.projectPath is required and must be a string" },
      { status: 422 }
    );
  }

  if (!payload.meta.platform || typeof payload.meta.platform !== "string") {
    return NextResponse.json<UploadResponse>(
      { success: false, error: "meta.platform is required and must be a string" },
      { status: 422 }
    );
  }

  if (!Array.isArray(payload.meta.availableSources)) {
    return NextResponse.json<UploadResponse>(
      { success: false, error: "meta.availableSources must be an array" },
      { status: 422 }
    );
  }

  // 5. 基本校验 - conversations
  if (!payload.conversations || !Array.isArray(payload.conversations)) {
    return NextResponse.json<UploadResponse>(
      { success: false, error: "conversations array is required" },
      { status: 422 }
    );
  }

  // 校验 conversation 子字段
  for (let i = 0; i < payload.conversations.length; i++) {
    const conv = payload.conversations[i];
    if (!conv.role || !["user", "assistant"].includes(conv.role)) {
      return NextResponse.json<UploadResponse>(
        { success: false, error: `conversations[${i}].role must be "user" or "assistant"` },
        { status: 422 }
      );
    }
    if (typeof conv.content !== "string") {
      return NextResponse.json<UploadResponse>(
        { success: false, error: `conversations[${i}].content must be a string` },
        { status: 422 }
      );
    }
    if (!conv.source || typeof conv.source !== "string") {
      return NextResponse.json<UploadResponse>(
        { success: false, error: `conversations[${i}].source is required` },
        { status: 422 }
      );
    }
  }

  // 6. 校验截图 base64 格式（如果有）
  if (payload.screenshots && Array.isArray(payload.screenshots)) {
    for (let i = 0; i < payload.screenshots.length; i++) {
      const ss = payload.screenshots[i];
      if (!ss.filename || typeof ss.filename !== "string") {
        return NextResponse.json<UploadResponse>(
          { success: false, error: `screenshots[${i}].filename is required` },
          { status: 422 }
        );
      }
      if (!ss.base64 || typeof ss.base64 !== "string") {
        return NextResponse.json<UploadResponse>(
          { success: false, error: `screenshots[${i}].base64 is required` },
          { status: 422 }
        );
      }
    }
  }

  // 7. 处理并存储
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
