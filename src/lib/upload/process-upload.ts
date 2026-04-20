/**
 * 上传处理编排器 — 接收 FeedbackPayload，存储到 KV
 */

import {
  upsertProject,
  getProjectById,
  getSessionById,
  insertSession,
  insertConversations,
  insertScreenshots,
  insertArtifacts,
  getConversations,
  appendConversations,
  appendScreenshots,
  appendArtifacts,
  updateSession,
} from "@/lib/db/store";
import { generateId } from "@/lib/utils";
import { parseSummaryContent } from "@/lib/parser/summary-parser";
import type {
  FeedbackPayload,
  Project,
  Session,
  Conversation,
  Screenshot,
  Artifact,
} from "@/types";

export interface ProcessResult {
  sessionId: string;
  projectId: string;
  projectName: string;
  conversationCount: number;
  screenshotCount: number;
}

export async function processUpload(payload: FeedbackPayload): Promise<ProcessResult> {
  const { meta, conversations, summary, environment, artifacts, screenshots, dataQuality } = payload;
  const now = new Date().toISOString();

  // 优先使用客户端传来的 projectId（本地持久化的 UUID），
  // 如果没有则 fallback 到 projectName slug 化（向后兼容）
  const projectId = meta.projectId || slugify(meta.projectName);
  const userId = meta.userId || null;

  // ─── 追加模式：如果传入了已有 sessionId ──────────────────
  if (meta.sessionId) {
    const existingSession = await getSessionById(meta.sessionId);
    if (existingSession && existingSession.projectId === projectId) {
      // 验证通过，执行增量追加
      return appendToExistingSession({
        sessionId: meta.sessionId,
        projectId,
        payload,
        now,
      });
    }
    // sessionId 无效或不匹配 projectId，fall through 创建新会话
  }

  // ─── 创建模式：新建 Session ────────────────────────────────
  const sessionId = `sess-${generateId()}`;

  // 提取涉及的 Skills
  const skillsUsed = extractSkillsFromSummary(summary);

  // 存储 Project（upsert）
  const project: Project = {
    id: projectId,
    userId,
    name: meta.projectName,
    path: meta.projectPath,
    platform: meta.platform,
    remoteUrl: environment?.git?.remoteUrl ?? null,
    createdAt: now,
    lastActiveAt: now,
    totalSessions: 1,
    totalFeedbacks: 1,
    availableSources: meta.availableSources,
  };

  // 获取已有项目信息来合并计数
  const existing = await getProjectById(projectId);
  if (existing) {
    project.createdAt = existing.createdAt;
    project.userId = existing.userId || userId;
    project.totalSessions = existing.totalSessions + 1;
    project.totalFeedbacks = existing.totalFeedbacks + 1;
    const srcSet = new Set([...existing.availableSources, ...meta.availableSources]);
    project.availableSources = Array.from(srcSet);
  }

  await upsertProject(project);

  // 存储 Session
  const session: Session = {
    id: sessionId,
    projectId,
    logVersion: meta.logVersion,
    sessionTime: now,
    conversationCount: conversations.length,
    skillsUsed,
    dataQuality: dataQuality ?? { items: [] },
    summaryMd: summary,
    environment,
    createdAt: now,
  };
  await insertSession(session);

  // 存储 Conversations
  const convRecords: Conversation[] = conversations.map((c, i) => ({
    id: `conv-${generateId()}`,
    sessionId,
    turnIndex: i,
    role: c.role,
    content: c.content,
    source: c.source,
    confidence: c.confidence,
    toolCalls: c.toolCalls ?? null,
    ts: c.ts,
  }));
  await insertConversations(sessionId, convRecords);

  // 存储 Screenshots
  const ssRecords: Screenshot[] = (screenshots ?? []).map((s) => ({
    id: `ss-${generateId()}`,
    sessionId,
    filename: s.filename,
    base64: s.base64,
    source: s.source,
    ts: now,
  }));
  await insertScreenshots(sessionId, ssRecords);

  // 存储 Artifacts
  const artRecords: Artifact[] = (artifacts ?? []).map((a) => ({
    id: `art-${generateId()}`,
    sessionId,
    filePath: a.path,
    content: a.content,
    size: a.size,
    collectedVia: a.collectedVia,
  }));
  await insertArtifacts(sessionId, artRecords);

  return {
    sessionId,
    projectId,
    projectName: meta.projectName,
    conversationCount: conversations.length,
    screenshotCount: ssRecords.length,
  };
}

// ─── 增量追加到已有会话 ─────────────────────────────────────

interface AppendContext {
  sessionId: string;
  projectId: string;
  payload: FeedbackPayload;
  now: string;
}

async function appendToExistingSession(ctx: AppendContext): Promise<ProcessResult> {
  const { sessionId, projectId, payload, now } = ctx;
  const { meta, conversations, summary, environment, artifacts, screenshots, dataQuality } = payload;

  // 1. 去重对话：只保留 ts > lastSyncTs 的对话
  const lastSyncTs = meta.lastSyncTs ?? "";
  const newConversations = lastSyncTs
    ? conversations.filter((c) => c.ts > lastSyncTs)
    : conversations;

  let appendedConversations = 0;
  let appendedScreenshots = 0;
  let appendedArtifacts = 0;

  // 2. 追加对话
  if (newConversations.length > 0) {
    const existingConvs = await getConversations(sessionId);
    const startIndex = existingConvs.length;
    const convRecords: Conversation[] = newConversations.map((c, i) => ({
      id: `conv-${generateId()}`,
      sessionId,
      turnIndex: startIndex + i,
      role: c.role,
      content: c.content,
      source: c.source,
      confidence: c.confidence,
      toolCalls: c.toolCalls ?? null,
      ts: c.ts,
    }));
    await appendConversations(sessionId, convRecords);
    appendedConversations = convRecords.length;
  }

  // 3. 追加截图
  if (screenshots && screenshots.length > 0) {
    const ssRecords: Screenshot[] = screenshots.map((s) => ({
      id: `ss-${generateId()}`,
      sessionId,
      filename: s.filename,
      base64: s.base64,
      source: s.source,
      ts: now,
    }));
    await appendScreenshots(sessionId, ssRecords);
    appendedScreenshots = ssRecords.length;
  }

  // 4. 追加产出文件
  if (artifacts && artifacts.length > 0) {
    const artRecords: Artifact[] = artifacts.map((a) => ({
      id: `art-${generateId()}`,
      sessionId,
      filePath: a.path,
      content: a.content,
      size: a.size,
      collectedVia: a.collectedVia,
    }));
    await appendArtifacts(sessionId, artRecords);
    appendedArtifacts = artRecords.length;
  }

  // 5. 更新 session 元数据
  const sessionUpdates: Partial<Session> = {};
  if (appendedConversations > 0) {
    const existingSession = await getSessionById(sessionId);
    if (existingSession) {
      sessionUpdates.conversationCount = existingSession.conversationCount + appendedConversations;
    }
  }
  if (summary !== undefined) {
    sessionUpdates.summaryMd = summary;
  }
  if (environment !== undefined) {
    sessionUpdates.environment = environment;
  }
  if (dataQuality !== undefined) {
    sessionUpdates.dataQuality = dataQuality;
  }
  if (Object.keys(sessionUpdates).length > 0) {
    await updateSession(sessionId, sessionUpdates);
  }

  // 6. 更新 project 的 lastActiveAt
  const project = await getProjectById(projectId);
  if (project) {
    project.lastActiveAt = now;
    await upsertProject(project);
  }

  return {
    sessionId,
    projectId,
    projectName: meta.projectName,
    conversationCount: appendedConversations,
    screenshotCount: appendedScreenshots,
  };
}

function slugify(name: string): string {
  // 先用 ASCII 安全字符替换，中文字符编码处理
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  // 如果包含非 ASCII 字符（如中文），进行编码以避免 key/URL 问题
  if (/[^\x00-\x7F]/.test(slug)) {
    return encodeURIComponent(slug);
  }
  return slug;
}

function extractSkillsFromSummary(summary: string | null): string[] {
  if (!summary) return [];
  try {
    const parsed = parseSummaryContent(summary);
    return parsed.skills.map((s) => s.name).filter(Boolean);
  } catch {
    return [];
  }
}
