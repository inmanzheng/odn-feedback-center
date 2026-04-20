# Skill 端接入指南（方案 B：增量上传）

本文档提供完整的 Skill 端代码示例，实现「一个对话框 = 一个 Session」的增量上传逻辑。

---

## 整体流程

```
┌─────────────────┐
│  用户开启新对话框？ │
└────────┬────────┘
         │
   是   ─┤
         │ 否
         │
    ┌────▼────┐         ┌──────────────┐
    │ 删除     │         │ 读取         │
    │ state.json│         │ state.json   │
    └────┬────┘         └──────┬───────┘
         │                       │
         └──────────┬──────────┘
                    │
             ┌──────▼──────┐
             │ 组装 payload │
             │ 填入         │
             │ sessionId /  │
             │ lastSyncTs    │
             └──────┬──────┘
                    │
             ┌──────▼──────┐
             │ POST 上传    │
             └──────┬──────┘
                    │
             ┌──────▼──────┐
             │ 持久化       │
             │ sessionId +  │
             │ lastSyncTs   │
             │ 到 state.json │
             └─────────────┘
```

---

## 文件结构

```
your-skill/
├── src/
│   ├── upload.ts          ← 上传主逻辑（本文件）
│   ├── state-manager.ts  ← 状态读写（本文件）
│   └── types.ts          ← 类型定义（本文件）
└── .odn/
    └── state.json         ← 持久化状态（自动生成）
```

---

## 1. 类型定义（`types.ts`）

```ts
// types.ts

export interface OdnState {
  /** 当前对话框对应的 Session ID（null 表示尚未上传过） */
  sessionId: string | null;
  /** 上次同步的最后一条对话时间戳（用于服务端去重） */
  lastSyncTs: string;
  /** 当前项目信息（用于检测是否切换了项目） */
  projectPath: string;
}

export interface FeedbackPayload {
  meta: {
    logVersion: string;
    projectId?: string;
    userId?: string;
    projectName: string;
    projectPath: string;
    platform: string;
    availableSources: string[];
    sessionId?: string;       // ← 增量上传时传入
    lastSyncTs?: string;      // ← 增量上传时传入
  };
  conversations: ConversationEntry[];
  summary: string | null;
  environment: EnvironmentSnapshot | null;
  artifacts: ArtifactEntry[];
  screenshots: ScreenshotEntry[];
  dataQuality: DataQualityReport;
}

export interface ConversationEntry {
  role: "user" | "assistant";
  content: string;
  source: string;
  confidence: "high" | "medium" | "low";
  ts: string;
  toolCalls?: unknown[] | null;
}

export interface ScreenshotEntry {
  filename: string;
  base64: string;
  source: string;
}

export interface ArtifactEntry {
  path: string;
  content: string;
  size: number;
  collectedVia: string;
}

export interface EnvironmentSnapshot {
  project: { name: string; path: string; odnVersion: string | null; devServer: string | null };
  git: { branch: string; lastCommits: string[]; status: string; remoteUrl: string | null };
  system: { platform: string; nodeVersion: string; npmVersion: string };
  workspace: { vscodeSettings: Record<string, unknown> | null; cursorRules: string | null; fileCount: number };
}

export interface DataQualityReport {
  items: { dimension: string; path: string; status: string; count: number; coverage: string | null }[];
}

export interface UploadResponse {
  success: boolean;
  sessionId?: string;
  projectId?: string;
  projectName?: string;
  conversationCount?: number;
  screenshotCount?: number;
  error?: string;
}
```

---

## 2. 状态管理器（`state-manager.ts`）

```ts
// state-manager.ts
import fs from "fs";
import path from "path";
import type { OdnState } from "./types";

const STATE_DIR = ".odn";
const STATE_FILE = "state.json";

/** 获取 state.json 的完整路径 */
function getStatePath(projectPath: string): string {
  return path.join(projectPath, STATE_DIR, STATE_FILE);
}

/** 读取状态（不存在则返回默认值） */
export function loadState(projectPath: string): OdnState {
  const statePath = getStatePath(projectPath);
  try {
    if (fs.existsSync(statePath)) {
      const raw = fs.readFileSync(statePath, "utf-8");
      return JSON.parse(raw) as OdnState;
    }
  } catch {
    // 文件损坏，视为无状态
  }

  // 默认值：尚未建立 Session
  return {
    sessionId: null,
    lastSyncTs: "",
    projectPath,
  };
}

/** 持久化状态 */
export function saveState(projectPath: string, state: OdnState): void {
  const statePath = getStatePath(projectPath);
  const dir = path.dirname(statePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), "utf-8");
}

/** 清除状态（用户开启新对话框时调用） */
export function clearState(projectPath: string): void {
  const statePath = getStatePath(projectPath);
  try {
    if (fs.existsSync(statePath)) {
      fs.unlinkSync(statePath);
    }
  } catch {
    // 忽略删除失败
  }
}

/** 检测是否应该清除状态（项目路径变更 或 用户主动开启新对话框） */
export function shouldResetState(currentPath: string, savedState: OdnState): boolean {
  return savedState.projectPath !== currentPath;
}
```

---

## 3. 上传主逻辑（`upload.ts`）

```ts
// upload.ts
import type {
  FeedbackPayload,
  ConversationEntry,
  ScreenshotEntry,
  ArtifactEntry,
  EnvironmentSnapshot,
  DataQualityReport,
  UploadResponse,
} from "./types";
import { loadState, saveState, clearState, shouldResetState } from "./state-manager";

const API_BASE = process.env.ODN_API_BASE ?? "https://your-domain.com/api/v1";
const API_KEY = process.env.ODN_API_KEY ?? "";

/**
 * 主入口：收集数据并上传
 *
 * @param options.projectPath  项目绝对路径
 * @param options.projectName  项目名称（package.json name）
 * @param options.platform     "cursor" | "codebuddy" | ...
 * @param options.isNewDialog  true = 用户开启了新对话框（清除旧状态）
 */
export async function uploadFeedback(options: {
  projectPath: string;
  projectName: string;
  platform: string;
  isNewDialog: boolean;
}): Promise<UploadResponse> {
  const { projectPath, projectName, platform, isNewDialog } = options;

  // 1. 处理状态：新对话框 → 清除旧状态
  if (isNewDialog) {
    clearState(projectPath);
  }

  let state = loadState(projectPath);

  // 2. 如果项目路径变了，也重置状态
  if (shouldResetState(projectPath, state)) {
    clearState(projectPath);
    state = loadState(projectPath);
  }

  // 3. 收集数据（你的 Skill 已有这些采集逻辑，这里只写接口）
  const conversations = await collectConversations();
  const screenshots = await collectScreenshots();
  const artifacts = await collectArtifacts();
  const summary = await collectSummary();
  const environment = await collectEnvironment(projectPath);
  const dataQuality = await collectDataQuality();

  // 4. 组装 payload
  const payload: FeedbackPayload = {
    meta: {
      logVersion: "2",
      projectId: generateProjectId(projectPath),  // 见下方工具函数
      userId: getUserId(),                          // 见下方工具函数
      projectName,
      projectPath,
      platform,
      availableSources: detectAvailableSources(),
      // 增量上传字段（非首次上传时填入）
      ...(state.sessionId ? { sessionId: state.sessionId } : {}),
      ...(state.lastSyncTs ? { lastSyncTs: state.lastSyncTs } : {}),
    },
    conversations,
    summary,
    environment,
    artifacts,
    screenshots,
    dataQuality,
  };

  // 5. 发送请求
  const response = await fetch(`${API_BASE}/logs/upload`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result: UploadResponse = await response.json();

  if (!result.success) {
    throw new Error(`Upload failed: ${result.error}`);
  }

  // 6. 持久化状态（无论创建还是追加，都保存 sessionId）
  const newState = {
    sessionId: result.sessionId ?? state.sessionId,  // 保留已有（追加模式 response 也有 sessionId）
    lastSyncTs: getLastConversationTs(conversations),  // 记录本次最后一条对话的 ts
    projectPath,
  };
  saveState(projectPath, newState);

  return result;
}

// ─── 数据采集占位函数（你的 Skill 实现）────────────────────

async function collectConversations(): Promise<ConversationEntry[]> {
  // TODO: 你的 Skill 已有此逻辑
  // 返回合并去重后的对话历史
  return [];
}

async function collectScreenshots(): Promise<ScreenshotEntry[]> {
  // TODO: 返回截图数组
  return [];
}

async function collectArtifacts(): Promise<ArtifactEntry[]> {
  // TODO: 返回产出文件数组
  return [];
}

async function collectSummary(): Promise<string | null> {
  // TODO: 读取 summary-{ts}.md 内容
  return null;
}

async function collectEnvironment(_projectPath: string): Promise<EnvironmentSnapshot | null> {
  // TODO: 采集 env-{ts}.json 内容
  return null;
}

async function collectDataQuality(): Promise<DataQualityReport> {
  // TODO: 返回数据质量报告
  return { items: [] };
}

// ─── 工具函数 ─────────────────────────────────────────────

function getLastConversationTs(conversations: ConversationEntry[]): string {
  if (conversations.length === 0) return "";
  // 按 ts 排序，取最后一条
  const sorted = [...conversations].sort((a, b) => a.ts.localeCompare(b.ts));
  return sorted[sorted.length - 1].ts;
}

/** 生成稳定的 projectId（与后端 slugify 逻辑对应） */
function generateProjectId(projectPath: string): string {
  // 简单方案：用项目路径的 hash
  // 或者让 Skill 生成一个 UUID 并持久化到 .odn/project-id
  const crypto = require("crypto");
  return "proj-" + crypto.createHash("md5").update(projectPath).digest("hex").slice(0, 16);
}

function getUserId(): string | undefined {
  // TODO: 生成并持久化用户 UUID（~/.odn/user-id）
  return undefined;
}

function detectAvailableSources(): string[] {
  // TODO: 检测当前可用的数据源
  return ["realtime"];
}
```

---

## 4. 在 Skill 中调用（示例）

### Cursor Skill 中调用

```ts
// 在你的 Skill 主入口（如 index.ts）中：

import { uploadFeedback } from "./upload";

// 方案 A：每次对话结束后上传（增量）
await uploadFeedback({
  projectPath: "/Users/dev/my-project",
  projectName: "my-project",
  platform: "cursor",
  isNewDialog: false,   // ← 同一对话框内，始终 false
});

// 方案 B：用户开启新对话框时
// 在 Skill 里检测"新对话"的方式（任选一种）：
//   1. 监听对话框创建事件（如果平台支持）
//   2. 用户手动触发（如发送 "/new-dialog" 命令）
//   3. 通过对话轮次判断：如果当前对话只有 1 条 user 消息，可能是新对话

await uploadFeedback({
  projectPath: "/Users/dev/my-project",
  projectName: "my-project",
  platform: "cursor",
  isNewDialog: true,    // ← 新对话框，清除旧 sessionId
});
```

### CodeBuddy Skill 中调用

```ts
// CodeBuddy 的 Skill 入口通常在 skill.ts

import { uploadFeedback } from "./upload";

export async function onSkillInvoke(context: SkillContext) {
  // 判断是否为新对话框（CodeBuddy 可通过 context 判断）
  const isNewDialog = context.isNewConversation ?? false;

  await uploadFeedback({
    projectPath: context.projectPath,
    projectName: context.projectName,
    platform: "codebuddy",
    isNewDialog,
  });
}
```

---

## 5. 环境变量配置

在 Skill 的运行环境中设置：

```bash
# .env 或 shell 环境变量
ODN_API_BASE=https://your-domain.com/api/v1
ODN_API_KEY=your-secret-api-key-here
```

---

## 6. 调试建议

```ts
// 开启调试日志
const DEBUG = process.env.ODN_DEBUG === "1";

async function uploadFeedback(options: ...) {
  if (DEBUG) {
    console.log("[ODN] State:", loadState(options.projectPath));
    console.log("[ODN] Payload meta:", payload.meta);
  }
  // ...
}
```

---

## 7. 完整流程验证

```bash
# 1. 首次上传（不传 sessionId）
curl -X POST https://your-domain.com/api/v1/logs/upload \
  -H "Authorization: Bearer $ODN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"meta":{"logVersion":"2","projectName":"test","projectPath":"/tmp/test","platform":"cursor","availableSources":[]},"conversations":[{"role":"user","content":"hello","source":"realtime","confidence":"high","ts":"2026-04-20T12:00:00Z"}],"summary":null,"environment":null,"artifacts":[],"screenshots":[],"dataQuality":{"items":[]}}'

# 响应中应包含 sessionId，如 "sess-abc123"

# 2. 第二次上传（同一对话框，传 sessionId + lastSyncTs）
curl -X POST https://your-domain.com/api/v1/logs/upload \
  -H "Authorization: Bearer $ODN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"meta":{"logVersion":"2","projectName":"test","projectPath":"/tmp/test","platform":"cursor","availableSources":[],"sessionId":"sess-abc123","lastSyncTs":"2026-04-20T12:00:00Z"},"conversations":[{"role":"assistant","content":"hi there","source":"realtime","confidence":"high","ts":"2026-04-20T12:01:00Z"}],"summary":null,"environment":null,"artifacts":[],"screenshots":[],"dataQuality":{"items":[]}}'

# 响应中 conversationCount 应为 1（只追加了新对话）
```
