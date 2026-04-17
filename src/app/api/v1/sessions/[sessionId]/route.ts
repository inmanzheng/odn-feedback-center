import { NextRequest, NextResponse } from "next/server";
import {
  getSessionById,
  getConversations,
  getScreenshots,
  getArtifacts,
  deleteSession,
  updateSession,
  appendConversations,
  appendScreenshots,
  appendArtifacts,
} from "@/lib/db/store";
import { validateApiKey } from "@/lib/auth";
import { generateId } from "@/lib/utils";
import type {
  PatchSessionPayload,
  PatchResponse,
  DeleteResponse,
  Conversation,
  Screenshot,
  Artifact,
} from "@/types";

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

/**
 * PATCH /api/v1/sessions/[sessionId]
 * 增量追加数据到已有会话（对话、截图、产出文件）
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  if (!validateApiKey(request)) {
    return NextResponse.json<PatchResponse>(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  let payload: PatchSessionPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json<PatchResponse>(
      { success: false, error: "Invalid JSON body" },
      { status: 422 }
    );
  }

  try {
    const session = await getSessionById(params.sessionId);
    if (!session) {
      return NextResponse.json<PatchResponse>(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    let appendedConversations = 0;
    let appendedScreenshots = 0;
    let appendedArtifacts = 0;

    // 追加对话
    if (payload.conversations && payload.conversations.length > 0) {
      // 从实际存储中获取当前对话，避免并发时 session.conversationCount 过时
      const existingConvs = await getConversations(params.sessionId);
      const startIndex = existingConvs.length;
      const convRecords: Conversation[] = payload.conversations.map((c, i) => ({
        id: `conv-${generateId()}`,
        sessionId: params.sessionId,
        turnIndex: startIndex + i,
        role: c.role,
        content: c.content,
        source: c.source,
        confidence: c.confidence,
        toolCalls: c.toolCalls ?? null,
        ts: c.ts,
      }));
      await appendConversations(params.sessionId, convRecords);
      appendedConversations = convRecords.length;
    }

    // 追加截图
    if (payload.screenshots && payload.screenshots.length > 0) {
      const ssRecords: Screenshot[] = payload.screenshots.map((s) => ({
        id: `ss-${generateId()}`,
        sessionId: params.sessionId,
        filename: s.filename,
        base64: s.base64,
        source: s.source,
        ts: new Date().toISOString(),
      }));
      await appendScreenshots(params.sessionId, ssRecords);
      appendedScreenshots = ssRecords.length;
    }

    // 追加产出文件
    if (payload.artifacts && payload.artifacts.length > 0) {
      const artRecords: Artifact[] = payload.artifacts.map((a) => ({
        id: `art-${generateId()}`,
        sessionId: params.sessionId,
        filePath: a.path,
        content: a.content,
        size: a.size,
        collectedVia: a.collectedVia,
      }));
      await appendArtifacts(params.sessionId, artRecords);
      appendedArtifacts = artRecords.length;
    }

    // 更新 session 元数据
    const sessionUpdates: Partial<typeof session> = {};
    if (appendedConversations > 0) {
      sessionUpdates.conversationCount = session.conversationCount + appendedConversations;
    }
    if (payload.summary !== undefined) {
      sessionUpdates.summaryMd = payload.summary;
    }
    if (payload.environment !== undefined) {
      sessionUpdates.environment = payload.environment;
    }
    if (payload.dataQuality !== undefined) {
      sessionUpdates.dataQuality = payload.dataQuality;
    }
    if (Object.keys(sessionUpdates).length > 0) {
      await updateSession(params.sessionId, sessionUpdates);
    }

    return NextResponse.json<PatchResponse>({
      success: true,
      sessionId: params.sessionId,
      appendedConversations,
      appendedScreenshots,
      appendedArtifacts,
    });
  } catch (err) {
    console.error("Failed to patch session:", err);
    return NextResponse.json<PatchResponse>(
      { success: false, error: "Failed to patch session" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/sessions/[sessionId]
 * 删除会话及其所有关联数据
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  if (!validateApiKey(request)) {
    return NextResponse.json<DeleteResponse>(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const session = await getSessionById(params.sessionId);
    if (!session) {
      return NextResponse.json<DeleteResponse>(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    await deleteSession(params.sessionId);

    return NextResponse.json<DeleteResponse>({
      success: true,
      deleted: params.sessionId,
    });
  } catch (err) {
    console.error("Failed to delete session:", err);
    return NextResponse.json<DeleteResponse>(
      { success: false, error: "Failed to delete session" },
      { status: 500 }
    );
  }
}
