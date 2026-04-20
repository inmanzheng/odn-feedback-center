# ODN Feedback Center API 文档

> Base URL: `https://<your-domain>/api/v1`
>
> 版本: v1 | 鉴权方式: Bearer Token

---

## 目录

- [鉴权说明](#鉴权说明)
- [通用响应格式](#通用响应格式)
- [接口列表](#接口列表)
  - [1. 上传反馈日志](#1-上传反馈日志)
  - [2. 获取项目列表](#2-获取项目列表)
  - [3. 获取项目详情](#3-获取项目详情)
  - [4. 删除项目](#4-删除项目)
  - [5. 获取会话详情](#5-获取会话详情)
  - [6. 增量追加会话数据](#6-增量追加会话数据)
  - [7. 删除会话](#7-删除会话)
- [数据类型定义](#数据类型定义)
- [错误码说明](#错误码说明)

---

## 鉴权说明

需要鉴权的接口需在请求头中携带 API Key：

```
Authorization: Bearer <API_SECRET_KEY>
```

| 接口 | 是否需要鉴权 |
|------|:----------:|
| POST /logs/upload | ✅ |
| GET /projects | ❌ |
| GET /projects/:projectId | ❌ |
| DELETE /projects/:projectId | ✅ |
| GET /sessions/:sessionId | ❌ |
| PATCH /sessions/:sessionId | ✅ |
| DELETE /sessions/:sessionId | ✅ |

---

## 通用响应格式

所有接口返回 JSON，包含 `success` 字段：

```json
// 成功
{
  "success": true,
  "data": { ... }
}

// 失败
{
  "success": false,
  "error": "错误描述信息"
}
```

---

## 接口列表

### 1. 上传反馈日志

上传 Feedback Skill 采集的完整日志数据。

**两种模式：**

| 模式 | 条件 | 行为 |
|------|------|------|
| **创建模式** | 不传 `meta.sessionId` | 创建新 Project（如不存在）+ 新 Session |
| **追加模式** | 传入 `meta.sessionId`（且该 Session 存在、且 `projectId` 匹配） | 追加数据到已有 Session，去重对话 |

> **推荐用法（方案 B）**：
> 1. 首次上传：不传 `sessionId` → 响应中拿到 `sessionId`
> 2. 持久化 `sessionId` 和末条对话的 `ts`（即 `lastSyncTs`）
> 3. 后续同一对话框上传：传入 `meta.sessionId` + `meta.lastSyncTs` → 只追加新对话
> 4. 开启新对话框时：不传 `sessionId` → 创建新 Session

- **URL**: `POST /api/v1/logs/upload`
- **鉴权**: ✅ 需要
- **Content-Type**: `application/json`
- **大小限制**: 10MB

#### 请求体 (Body)

```json
{
  "meta": {
    "logVersion": "2",
    "projectId": "proj-xxx",          // 可选，客户端生成的 UUID
    "userId": "user-xxx",             // 可选，客户端用户 UUID
    "projectName": "my-project",      // 必填，项目名称
    "projectPath": "/path/to/project",// 必填，项目绝对路径
    "platform": "cursor",             // 必填，平台标识
    "availableSources": ["realtime", "specstory"], // 必填，数据来源数组
    "sessionId": "sess-abc123",      // 可选，传入则追加到已有会话
    "lastSyncTs": "2026-04-17T10:00:00Z"  // 可选，与 sessionId 配合，只追加 ts > lastSyncTs 的对话
  },
  "conversations": [                  // 必填，对话记录数组
    {
      "role": "user",                 // 必填，"user" | "assistant"
      "content": "请帮我修复这个bug", // 必填，对话内容
      "source": "realtime",           // 必填，数据来源
      "confidence": "high",           // 置信度
      "ts": "2026-04-17T10:00:00Z",  // 时间戳
      "toolCalls": null               // 可选，工具调用信息
    }
  ],
  "summary": "## 会话摘要\n...",      // 可选，Markdown 摘要
  "environment": {                     // 可选，环境快照
    "project": {
      "name": "my-project",
      "path": "/path/to/project",
      "odnVersion": "1.0.0",
      "devServer": "http://localhost:3000"
    },
    "git": {
      "branch": "main",
      "lastCommits": ["abc1234"],
      "status": "clean",
      "remoteUrl": "https://github.com/user/repo.git"
    },
    "system": {
      "platform": "darwin",
      "nodeVersion": "20.20.1",
      "npmVersion": "10.8.0"
    },
    "workspace": {
      "vscodeSettings": null,
      "cursorRules": null,
      "fileCount": 156
    }
  },
  "artifacts": [                       // 可选，产出文件
    {
      "path": "src/index.ts",
      "content": "...",
      "size": 1024,
      "collectedVia": "git-diff"
    }
  ],
  "screenshots": [                     // 可选，截图（base64）
    {
      "filename": "screenshot-001.png",// 必填
      "base64": "data:image/png;base64,...", // 必填
      "source": "realtime"
    }
  ],
  "dataQuality": {                     // 数据质量报告
    "items": [
      {
        "dimension": "conversations",
        "path": "realtime.jsonl",
        "status": "success",
        "count": 42,
        "coverage": "95%"
      }
    ]
  }
}
```

#### 字段校验规则

| 字段 | 校验规则 |
|------|---------|
| `meta.projectName` | 必填，string |
| `meta.projectPath` | 必填，string |
| `meta.platform` | 必填，string |
| `meta.availableSources` | 必填，array |
| `conversations` | 必填，array |
| `conversations[].role` | 必填，`"user"` 或 `"assistant"` |
| `conversations[].content` | 必填，string |
| `conversations[].source` | 必填，string |
| `screenshots[].filename` | 必填（如有截图），string |
| `screenshots[].base64` | 必填（如有截图），string |

#### 成功响应

```json
// 创建模式（不传 sessionId）
{
  "success": true,
  "sessionId": "sess-abc123",   // ← 持久化此值，下次上传传入 meta.sessionId
  "projectId": "proj-xxx",
  "projectName": "my-project",
  "conversationCount": 42,
  "screenshotCount": 3
}

// 追加模式（传入 sessionId，只返回本次追加数量）
{
  "success": true,
  "sessionId": "sess-abc123",   // ← 同一个 sessionId
  "projectId": "proj-xxx",
  "projectName": "my-project",
  "conversationCount": 5,          // ← 本次追加的对话数（非累计）
  "screenshotCount": 1              // ← 本次追加的截图数
}
```

> **Skill 端持久化建议**：
> 在本地项目目录（如 `.odn/state.json`）持久化以下字段：
> ```json
> {
>   "sessionId": "sess-abc123",
>   "lastSyncTs": "2026-04-17T11:30:00Z"  // 本次上传最后一条对话的 ts
> }
> ```
> 下次上传时读取并填入 `meta.sessionId` 和 `meta.lastSyncTs`。
> 当用户开启新对话框时，删除持久化文件，下次上传将自动创建新 Session。

#### 错误响应

| 状态码 | 场景 | 示例 |
|-------|------|------|
| 401 | 未授权 | `{"success": false, "error": "Unauthorized"}` |
| 413 | 请求体超过 10MB | `{"success": false, "error": "Payload too large (max 10MB)"}` |
| 422 | JSON 解析失败或字段校验不通过 | `{"success": false, "error": "meta.projectName is required and must be a string"}` |
| 500 | 服务器内部错误 | `{"success": false, "error": "Internal processing error"}` |

---

### 2. 获取项目列表

获取所有已存储的项目。

- **URL**: `GET /api/v1/projects`
- **鉴权**: ❌ 不需要

#### 请求参数

无

#### 成功响应

```json
// 200 OK
{
  "success": true,
  "data": [
    {
      "id": "proj-xxx",
      "userId": "user-xxx",
      "name": "my-project",
      "path": "/path/to/project",
      "platform": "cursor",
      "remoteUrl": "https://github.com/user/repo.git",
      "createdAt": "2026-04-17T10:00:00Z",
      "lastActiveAt": "2026-04-17T18:00:00Z",
      "totalSessions": 5,
      "totalFeedbacks": 120,
      "availableSources": ["realtime", "specstory"]
    }
  ]
}
```

#### 错误响应

| 状态码 | 场景 |
|-------|------|
| 500 | 获取项目列表失败 |

---

### 3. 获取项目详情

获取单个项目的详细信息及其所有会话列表。

- **URL**: `GET /api/v1/projects/:projectId`
- **鉴权**: ❌ 不需要

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `projectId` | string | 项目 ID |

#### 成功响应

```json
// 200 OK
{
  "success": true,
  "data": {
    "project": {
      "id": "proj-xxx",
      "userId": "user-xxx",
      "name": "my-project",
      "path": "/path/to/project",
      "platform": "cursor",
      "remoteUrl": "https://github.com/user/repo.git",
      "createdAt": "2026-04-17T10:00:00Z",
      "lastActiveAt": "2026-04-17T18:00:00Z",
      "totalSessions": 5,
      "totalFeedbacks": 120,
      "availableSources": ["realtime", "specstory"]
    },
    "sessions": [
      {
        "id": "sess-abc123",
        "projectId": "proj-xxx",
        "logVersion": "2",
        "sessionTime": "2026-04-17T10:00:00Z",
        "conversationCount": 42,
        "skillsUsed": ["code-review", "debug"],
        "dataQuality": { "items": [...] },
        "summaryMd": "## 会话摘要\n...",
        "environment": { ... },
        "createdAt": "2026-04-17T10:00:00Z"
      }
    ]
  }
}
```

#### 错误响应

| 状态码 | 场景 |
|-------|------|
| 404 | 项目不存在 |
| 500 | 服务器内部错误 |

---

### 4. 删除项目

删除项目及其所有关联数据（会话、对话、截图、产出文件），级联删除。

- **URL**: `DELETE /api/v1/projects/:projectId`
- **鉴权**: ✅ 需要

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `projectId` | string | 项目 ID |

#### 成功响应

```json
// 200 OK
{
  "success": true,
  "deleted": "proj-xxx"
}
```

#### 错误响应

| 状态码 | 场景 |
|-------|------|
| 401 | 未授权 |
| 404 | 项目不存在 |
| 500 | 删除失败 |

---

### 5. 获取会话详情

获取单个会话的完整数据，包含对话记录、截图和产出文件。

- **URL**: `GET /api/v1/sessions/:sessionId`
- **鉴权**: ❌ 不需要

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `sessionId` | string | 会话 ID |

#### 成功响应

```json
// 200 OK
{
  "success": true,
  "data": {
    "session": {
      "id": "sess-abc123",
      "projectId": "proj-xxx",
      "logVersion": "2",
      "sessionTime": "2026-04-17T10:00:00Z",
      "conversationCount": 42,
      "skillsUsed": ["code-review"],
      "dataQuality": { "items": [...] },
      "summaryMd": "## 会话摘要\n...",
      "environment": { ... },
      "createdAt": "2026-04-17T10:00:00Z"
    },
    "conversations": [
      {
        "id": "conv-xyz789",
        "sessionId": "sess-abc123",
        "turnIndex": 0,
        "role": "user",
        "content": "请帮我修复这个bug",
        "source": "realtime",
        "confidence": "high",
        "toolCalls": null,
        "ts": "2026-04-17T10:00:00Z"
      },
      {
        "id": "conv-xyz790",
        "sessionId": "sess-abc123",
        "turnIndex": 1,
        "role": "assistant",
        "content": "我来看一下这个问题...",
        "source": "realtime",
        "confidence": "high",
        "toolCalls": [
          { "name": "read_file", "status": "success" }
        ],
        "ts": "2026-04-17T10:00:05Z"
      }
    ],
    "screenshots": [
      {
        "id": "ss-def456",
        "sessionId": "sess-abc123",
        "filename": "screenshot-001.png",
        "base64": "data:image/png;base64,...",
        "source": "realtime",
        "ts": "2026-04-17T10:00:10Z"
      }
    ],
    "artifacts": [
      {
        "id": "art-ghi789",
        "sessionId": "sess-abc123",
        "filePath": "src/index.ts",
        "content": "export function hello() { ... }",
        "size": 1024,
        "collectedVia": "git-diff"
      }
    ]
  }
}
```

#### 错误响应

| 状态码 | 场景 |
|-------|------|
| 404 | 会话不存在 |
| 500 | 服务器内部错误 |

---

### 6. 增量追加会话数据

向已有会话追加对话记录、截图、产出文件，或更新摘要/环境/质量报告。

- **URL**: `PATCH /api/v1/sessions/:sessionId`
- **鉴权**: ✅ 需要
- **Content-Type**: `application/json`

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `sessionId` | string | 会话 ID |

#### 请求体 (Body)

所有字段均为可选，按需传递：

```json
{
  "conversations": [                   // 可选，追加的对话记录
    {
      "role": "user",
      "content": "继续帮我优化",
      "source": "realtime",
      "confidence": "high",
      "ts": "2026-04-17T11:00:00Z",
      "toolCalls": null
    }
  ],
  "screenshots": [                     // 可选，追加的截图
    {
      "filename": "screenshot-002.png",
      "base64": "data:image/png;base64,...",
      "source": "realtime"
    }
  ],
  "artifacts": [                       // 可选，追加的产出文件
    {
      "path": "src/utils.ts",
      "content": "...",
      "size": 512,
      "collectedVia": "git-diff"
    }
  ],
  "summary": "## 更新后的摘要\n...",   // 可选，覆盖更新摘要
  "environment": { ... },              // 可选，覆盖更新环境快照
  "dataQuality": { "items": [...] }    // 可选，覆盖更新质量报告
}
```

#### 成功响应

```json
// 200 OK
{
  "success": true,
  "sessionId": "sess-abc123",
  "appendedConversations": 2,
  "appendedScreenshots": 1,
  "appendedArtifacts": 1
}
```

#### 错误响应

| 状态码 | 场景 |
|-------|------|
| 401 | 未授权 |
| 404 | 会话不存在 |
| 422 | JSON 解析失败 |
| 500 | 服务器内部错误 |

---

### 7. 删除会话

删除会话及其所有关联数据（对话、截图、产出文件）。

- **URL**: `DELETE /api/v1/sessions/:sessionId`
- **鉴权**: ✅ 需要

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `sessionId` | string | 会话 ID |

#### 成功响应

```json
// 200 OK
{
  "success": true,
  "deleted": "sess-abc123"
}
```

#### 错误响应

| 状态码 | 场景 |
|-------|------|
| 401 | 未授权 |
| 404 | 会话不存在 |
| 500 | 删除失败 |

---

## 数据类型定义

### Project

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 项目 ID |
| `userId` | string \| null | 用户 ID |
| `name` | string | 项目名称 |
| `path` | string | 项目路径 |
| `platform` | string | 平台标识 (cursor / codebuddy / ...) |
| `remoteUrl` | string \| null | Git 远程仓库 URL |
| `createdAt` | string | 创建时间 (ISO 8601) |
| `lastActiveAt` | string | 最后活跃时间 (ISO 8601) |
| `totalSessions` | number | 总会话数 |
| `totalFeedbacks` | number | 总反馈数 |
| `availableSources` | string[] | 可用数据来源 |

### Session

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 会话 ID |
| `projectId` | string | 所属项目 ID |
| `logVersion` | string | 日志版本 |
| `sessionTime` | string | 会话时间 (ISO 8601) |
| `conversationCount` | number | 对话轮次数 |
| `skillsUsed` | string[] | 使用的技能列表 |
| `dataQuality` | DataQualityReport | 数据质量报告 |
| `summaryMd` | string \| null | Markdown 格式摘要 |
| `environment` | EnvironmentSnapshot \| null | 环境快照 |
| `createdAt` | string | 创建时间 (ISO 8601) |

### Conversation

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 对话 ID |
| `sessionId` | string | 所属会话 ID |
| `turnIndex` | number | 对话轮次索引 (从 0 开始) |
| `role` | `"user"` \| `"assistant"` | 角色 |
| `content` | string | 对话内容 |
| `source` | string | 数据来源 |
| `confidence` | `"high"` \| `"medium"` \| `"low"` | 置信度 |
| `toolCalls` | ToolCallInfo[] \| null | 工具调用信息 |
| `ts` | string | 时间戳 (ISO 8601) |

### Screenshot

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 截图 ID |
| `sessionId` | string | 所属会话 ID |
| `filename` | string | 文件名 |
| `base64` | string | Base64 编码图片数据 |
| `source` | string | 来源 |
| `ts` | string | 时间戳 (ISO 8601) |

### Artifact

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 产出文件 ID |
| `sessionId` | string | 所属会话 ID |
| `filePath` | string | 文件路径 |
| `content` | string \| null | 文件内容 |
| `size` | number | 文件大小 (bytes) |
| `collectedVia` | string | 采集方式 (git-diff / log / find) |

### EnvironmentSnapshot

| 字段 | 类型 | 说明 |
|------|------|------|
| `project.name` | string | 项目名 |
| `project.path` | string | 项目路径 |
| `project.odnVersion` | string \| null | ODN 版本 |
| `project.devServer` | string \| null | 开发服务器地址 |
| `git.branch` | string | Git 分支 |
| `git.lastCommits` | string[] | 最近提交 |
| `git.status` | string | Git 状态 |
| `git.remoteUrl` | string \| null | 远程仓库 URL |
| `system.platform` | string | 操作系统 |
| `system.nodeVersion` | string | Node.js 版本 |
| `system.npmVersion` | string | npm 版本 |
| `workspace.vscodeSettings` | object \| null | VS Code 设置 |
| `workspace.cursorRules` | string \| null | Cursor 规则 |
| `workspace.fileCount` | number | 文件数量 |

### DataQualityReport

| 字段 | 类型 | 说明 |
|------|------|------|
| `items` | DataQualityItem[] | 质量报告条目 |

### DataQualityItem

| 字段 | 类型 | 说明 |
|------|------|------|
| `dimension` | string | 维度名称 |
| `path` | string | 数据路径 |
| `status` | `"success"` \| `"skipped"` \| `"failed"` | 状态 |
| `count` | number | 数量 |
| `coverage` | string \| null | 覆盖率 |

### ToolCallInfo

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 工具名称 |
| `status` | string \| undefined | 执行状态 |
| `[key]` | unknown | 其他扩展字段 |

---

## 错误码说明

| HTTP 状态码 | 说明 |
|:-----------:|------|
| **200** | 请求成功 |
| **401** | 未授权，缺少或无效的 API Key |
| **404** | 资源不存在（项目/会话未找到） |
| **413** | 请求体过大（超过 10MB 限制） |
| **422** | 请求体格式错误（JSON 解析失败或字段校验不通过） |
| **500** | 服务器内部错误 |

---

## cURL 调用示例

### 上传反馈日志

```bash
curl -X POST https://<your-domain>/api/v1/logs/upload \
  -H "Authorization: Bearer <API_SECRET_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "meta": {
      "logVersion": "2",
      "projectName": "my-project",
      "projectPath": "/Users/dev/my-project",
      "platform": "cursor",
      "availableSources": ["realtime"]
    },
    "conversations": [
      {
        "role": "user",
        "content": "帮我写一个排序函数",
        "source": "realtime",
        "confidence": "high",
        "ts": "2026-04-17T10:00:00Z"
      }
    ],
    "summary": null,
    "environment": null,
    "artifacts": [],
    "screenshots": [],
    "dataQuality": { "items": [] }
  }'
```

### 获取项目列表

```bash
curl https://<your-domain>/api/v1/projects
```

### 获取项目详情

```bash
curl https://<your-domain>/api/v1/projects/proj-xxx
```

### 删除项目

```bash
curl -X DELETE https://<your-domain>/api/v1/projects/proj-xxx \
  -H "Authorization: Bearer <API_SECRET_KEY>"
```

### 获取会话详情

```bash
curl https://<your-domain>/api/v1/sessions/sess-abc123
```

### 增量追加数据

```bash
curl -X PATCH https://<your-domain>/api/v1/sessions/sess-abc123 \
  -H "Authorization: Bearer <API_SECRET_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "conversations": [
      {
        "role": "assistant",
        "content": "已完成修复",
        "source": "realtime",
        "confidence": "high",
        "ts": "2026-04-17T11:00:00Z"
      }
    ]
  }'
```

### 删除会话

```bash
curl -X DELETE https://<your-domain>/api/v1/sessions/sess-abc123 \
  -H "Authorization: Bearer <API_SECRET_KEY>"
```
