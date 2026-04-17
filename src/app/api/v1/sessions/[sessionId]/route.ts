import { NextResponse } from "next/server";
import {
  getSessionById,
  getConversations,
  getScreenshots,
  getArtifacts,
} from "@/lib/db/store";

/**
 * GET /api/v1/sessions/[sessionId]
 * 获取单个会话的完整数据（含对话、截图、产出文件）
 */
export async function GET(
  _request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await getSessionById(params.sessionId);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    const [conversations, screenshots, artifacts] = await Promise.all([
      getConversations(params.sessionId),
      getScreenshots(params.sessionId),
      getArtifacts(params.sessionId),
    ]);

    return NextResponse.json({
      success: true,
      data: { session, conversations, screenshots, artifacts },
    });
  } catch (err) {
    console.error("Failed to get session detail:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}
