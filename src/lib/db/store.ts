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
