// ─── Skill 端发送的数据格式 ─────────────────────────────
// 这是 Feedback Skill 通过 POST /api/v1/logs/upload 提交的 JSON body

export interface FeedbackPayload {
  /** 项目元信息 */
  meta: {
    logVersion: string;         // "2"
    projectName: string;        // package.json name 或目录名
    projectPath: string;        // 项目绝对路径
    platform: string;           // "cursor" | "codebuddy" | ...
    availableSources: string[]; // ["realtime", "specstory", "cursor-db", "agent-recall"]
  };
  /** 合并去重后的对话历史 */
  conversations: ConversationEntry[];
  /** 上下文摘要 (summary-{ts}.md 的完整 Markdown) */
  summary: string | null;
  /** 环境快照 (env-{ts}.json) */
  environment: EnvironmentSnapshot | null;
  /** 产出文件 (artifacts-{ts}.jsonl 的每行) */
  artifacts: ArtifactEntry[];
  /** 截图（base64 编码） */
  screenshots: ScreenshotEntry[];
  /** 数据质量报告 */
  dataQuality: DataQualityReport;
}

export interface ConversationEntry {
  role: "user" | "assistant";
  content: string;
  source: "realtime" | "specstory" | "cursor-db" | "agent-recall";
  confidence: "high" | "medium" | "low";
  ts: string;
  toolCalls?: ToolCallInfo[] | null;
}

export interface ToolCallInfo {
  name: string;
  status?: string;
  [key: string]: unknown;
}

export interface EnvironmentSnapshot {
  project: {
    name: string;
    path: string;
    odnVersion: string | null;
    devServer: string | null;
  };
  git: {
    branch: string;
    lastCommits: string[];
    status: string;
    remoteUrl: string | null;
  };
  system: {
    platform: string;
    nodeVersion: string;
    npmVersion: string;
  };
  workspace: {
    vscodeSettings: Record<string, unknown> | null;
    cursorRules: string | null;
    fileCount: string;
  };
}

export interface ArtifactEntry {
  path: string;
  content: string;
  size: number;
  collectedVia: string; // "git-diff" | "log" | "find"
}

export interface ScreenshotEntry {
  filename: string;
  base64: string;   // data:image/png;base64,... 或纯 base64
  source: string;    // "realtime" | "playwright" | "user"
}

export interface DataQualityItem {
  dimension: string;
  path: string;
  status: "success" | "skipped" | "failed";
  count: number;
  coverage: string | null;
}

export interface DataQualityReport {
  items: DataQualityItem[];
}

// ─── 存储在 KV 中的数据结构 ───────────────────────────────

export interface Project {
  id: string;
  name: string;
  path: string;
  platform: string;
  remoteUrl: string | null;
  createdAt: string;
  lastActiveAt: string;
  totalSessions: number;
  totalFeedbacks: number;
  availableSources: string[];
}

export interface Session {
  id: string;
  projectId: string;
  logVersion: string;
  sessionTime: string;
  conversationCount: number;
  skillsUsed: string[];
  dataQuality: DataQualityReport;
  summaryMd: string | null;
  environment: EnvironmentSnapshot | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  sessionId: string;
  turnIndex: number;
  role: "user" | "assistant";
  content: string;
  source: "realtime" | "specstory" | "cursor-db" | "agent-recall";
  confidence: "high" | "medium" | "low";
  toolCalls: ToolCallInfo[] | null;
  ts: string;
}

export interface Screenshot {
  id: string;
  sessionId: string;
  filename: string;
  base64: string;
  source: string;
  ts: string;
}

export interface Artifact {
  id: string;
  sessionId: string;
  filePath: string;
  content: string | null;
  size: number;
  collectedVia: string;
}

// ─── 增量追加 Payload（PATCH /api/v1/sessions/[sessionId]）────

export interface PatchSessionPayload {
  /** 追加的对话记录 */
  conversations?: ConversationEntry[];
  /** 追加的截图 */
  screenshots?: ScreenshotEntry[];
  /** 追加的产出文件 */
  artifacts?: ArtifactEntry[];
  /** 更新摘要（覆盖） */
  summary?: string;
  /** 更新环境快照（覆盖） */
  environment?: EnvironmentSnapshot;
  /** 更新数据质量报告（覆盖） */
  dataQuality?: DataQualityReport;
}

// ─── API 响应类型 ────────────────────────────────────────

export interface UploadResponse {
  success: boolean;
  sessionId?: string;
  projectId?: string;
  projectName?: string;
  conversationCount?: number;
  screenshotCount?: number;
  error?: string;
}

export interface PatchResponse {
  success: boolean;
  sessionId?: string;
  appendedConversations?: number;
  appendedScreenshots?: number;
  appendedArtifacts?: number;
  error?: string;
}

export interface DeleteResponse {
  success: boolean;
  deleted?: string;
  error?: string;
}
