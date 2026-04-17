/**
 * 上传处理编排器 — 接收 FeedbackPayload，存储到 KV
 */

import {
  upsertProject,
  getProjectById,
  insertSession,
  insertConversations,
  insertScreenshots,
  insertArtifacts,
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

  // 1. 生成 ID
  // 优先使用客户端传来的 projectId（本地持久化的 UUID），
  // 如果没有则 fallback 到 projectName slug 化（向后兼容）
  const projectId = meta.projectId || slugify(meta.projectName);
  const userId = meta.userId || null;
  const sessionId = `sess-${generateId()}`;
  const now = new Date().toISOString();

  // 2. 提取涉及的 Skills
  const skillsUsed = extractSkillsFromSummary(summary);

  // 3. 存储 Project（upsert）
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
    project.userId = existing.userId || userId; // 保留最初设置的 userId
    project.totalSessions = existing.totalSessions + 1;
    project.totalFeedbacks = existing.totalFeedbacks + 1;
    // 合并 availableSources
    const srcSet = new Set([...existing.availableSources, ...meta.availableSources]);
    project.availableSources = Array.from(srcSet);
  }

  await upsertProject(project);

  // 4. 存储 Session
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

  // 5. 存储 Conversations
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

  // 6. 存储 Screenshots
  const ssRecords: Screenshot[] = (screenshots ?? []).map((s) => ({
    id: `ss-${generateId()}`,
    sessionId,
    filename: s.filename,
    base64: s.base64,
    source: s.source,
    ts: now,
  }));
  await insertScreenshots(sessionId, ssRecords);

  // 7. 存储 Artifacts
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
