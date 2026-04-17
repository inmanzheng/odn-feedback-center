/**
 * KV 存储层 — 使用 Upstash Redis 存储反馈数据
 *
 * Key 设计：
 *   projects                     → Set<projectId>
 *   project:{projectId}          → Project JSON
 *   sessions:{projectId}         → Set<sessionId>
 *   session:{sessionId}          → Session JSON
 *   conversations:{sessionId}    → Conversation[] JSON
 *   screenshots:{sessionId}      → Screenshot[] JSON
 *   artifacts:{sessionId}        → Artifact[] JSON
 */

import { Redis } from "@upstash/redis";
import type {
  Project,
  Session,
  Conversation,
  Screenshot,
  Artifact,
} from "@/types";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// ─── Projects ───────────────────────────────────────────

export async function getProjects(): Promise<Project[]> {
  const ids = await redis.smembers("projects");
  if (!ids || ids.length === 0) return [];

  const pipeline = redis.pipeline();
  for (const id of ids) {
    pipeline.get(`project:${id}`);
  }
  const results = await pipeline.exec();
  return (results.filter(Boolean) as Project[]).sort(
    (a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
  );
}

export async function getProjectById(id: string): Promise<Project | null> {
  return redis.get<Project>(`project:${id}`);
}

export async function upsertProject(project: Project): Promise<void> {
  await redis.sadd("projects", project.id);
  await redis.set(`project:${project.id}`, JSON.stringify(project));
}

// ─── Sessions ───────────────────────────────────────────

export async function getSessions(projectId: string): Promise<Session[]> {
  const ids = await redis.smembers(`sessions:${projectId}`);
  if (!ids || ids.length === 0) return [];

  const pipeline = redis.pipeline();
  for (const id of ids) {
    pipeline.get(`session:${id}`);
  }
  const results = await pipeline.exec();
  return (results.filter(Boolean) as Session[]).sort(
    (a, b) => new Date(b.sessionTime).getTime() - new Date(a.sessionTime).getTime()
  );
}

export async function getSessionById(id: string): Promise<Session | null> {
  return redis.get<Session>(`session:${id}`);
}

export async function insertSession(session: Session): Promise<void> {
  await redis.sadd(`sessions:${session.projectId}`, session.id);
  await redis.set(`session:${session.id}`, JSON.stringify(session));
}

// ─── Conversations ──────────────────────────────────────

export async function getConversations(sessionId: string): Promise<Conversation[]> {
  const data = await redis.get<Conversation[]>(`conversations:${sessionId}`);
  return data ?? [];
}

export async function insertConversations(
  sessionId: string,
  conversations: Conversation[]
): Promise<void> {
  await redis.set(`conversations:${sessionId}`, JSON.stringify(conversations));
}

// ─── Screenshots ────────────────────────────────────────

export async function getScreenshots(sessionId: string): Promise<Screenshot[]> {
  const data = await redis.get<Screenshot[]>(`screenshots:${sessionId}`);
  return data ?? [];
}

export async function insertScreenshots(
  sessionId: string,
  screenshots: Screenshot[]
): Promise<void> {
  if (screenshots.length > 0) {
    await redis.set(`screenshots:${sessionId}`, JSON.stringify(screenshots));
  }
}

// ─── Artifacts ──────────────────────────────────────────

export async function getArtifacts(sessionId: string): Promise<Artifact[]> {
  const data = await redis.get<Artifact[]>(`artifacts:${sessionId}`);
  return data ?? [];
}

export async function insertArtifacts(
  sessionId: string,
  artifacts: Artifact[]
): Promise<void> {
  if (artifacts.length > 0) {
    await redis.set(`artifacts:${sessionId}`, JSON.stringify(artifacts));
  }
}

// ─── Append (追加到已有数据) ────────────────────────────

export async function appendConversations(
  sessionId: string,
  newConversations: Conversation[]
): Promise<number> {
  const existing = await getConversations(sessionId);
  const merged = [...existing, ...newConversations];
  await redis.set(`conversations:${sessionId}`, JSON.stringify(merged));
  return merged.length;
}

export async function appendScreenshots(
  sessionId: string,
  newScreenshots: Screenshot[]
): Promise<number> {
  if (newScreenshots.length === 0) return 0;
  const existing = await getScreenshots(sessionId);
  const merged = [...existing, ...newScreenshots];
  await redis.set(`screenshots:${sessionId}`, JSON.stringify(merged));
  return merged.length;
}

export async function appendArtifacts(
  sessionId: string,
  newArtifacts: Artifact[]
): Promise<number> {
  if (newArtifacts.length === 0) return 0;
  const existing = await getArtifacts(sessionId);
  const merged = [...existing, ...newArtifacts];
  await redis.set(`artifacts:${sessionId}`, JSON.stringify(merged));
  return merged.length;
}

// ─── Update Session ─────────────────────────────────────

export async function updateSession(
  sessionId: string,
  updates: Partial<Session>
): Promise<void> {
  const existing = await getSessionById(sessionId);
  if (!existing) throw new Error(`Session ${sessionId} not found`);
  const updated = { ...existing, ...updates, id: sessionId };
  await redis.set(`session:${sessionId}`, JSON.stringify(updated));
}

// ─── Delete ─────────────────────────────────────────────

export async function deleteSession(sessionId: string): Promise<void> {
  const session = await getSessionById(sessionId);
  if (!session) return;

  // 删除关联数据
  const pipeline = redis.pipeline();
  pipeline.del(`conversations:${sessionId}`);
  pipeline.del(`screenshots:${sessionId}`);
  pipeline.del(`artifacts:${sessionId}`);
  pipeline.del(`session:${sessionId}`);
  pipeline.srem(`sessions:${session.projectId}`, sessionId);
  await pipeline.exec();

  // 更新 project 计数
  const project = await getProjectById(session.projectId);
  if (project) {
    project.totalSessions = Math.max(0, project.totalSessions - 1);
    project.totalFeedbacks = Math.max(0, project.totalFeedbacks - 1);
    await upsertProject(project);
  }
}

export async function deleteProject(projectId: string): Promise<void> {
  // 先删除所有关联 sessions
  const sessionIds = await redis.smembers(`sessions:${projectId}`);
  for (const sid of sessionIds) {
    const pipeline = redis.pipeline();
    pipeline.del(`conversations:${sid}`);
    pipeline.del(`screenshots:${sid}`);
    pipeline.del(`artifacts:${sid}`);
    pipeline.del(`session:${sid}`);
    await pipeline.exec();
  }

  // 删除 sessions 集合、project 本身、从 projects 集合移除
  const pipeline = redis.pipeline();
  pipeline.del(`sessions:${projectId}`);
  pipeline.del(`project:${projectId}`);
  pipeline.srem("projects", projectId);
  await pipeline.exec();
}
