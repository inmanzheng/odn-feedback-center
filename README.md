# ODN Feedback Center

收集、存储和可视化展示来自各平台 Feedback Skill 采集的上下文日志数据。

## 系统架构

```
┌─────────────────────────────┐     HTTP POST JSON      ┌─────────────────────────────┐
│    Feedback Skill           │  ──────────────────────▶ │    ODN Feedback Center       │
│  (Cursor / CodeBuddy 等)    │                          │    (Vercel + Next.js)        │
│                             │                          │                             │
│  · 采集对话历史              │   Authorization:          │  · API: /api/v1/logs/upload  │
│  · 采集截图                 │   Bearer <API_KEY>       │  · 存储: Upstash Redis       │
│  · 采集环境上下文            │                          │  · 前端: 可视化仪表盘         │
│  · 生成上下文摘要            │                          │                             │
└─────────────────────────────┘                          └─────────────────────────────┘
```

## Skill 端发送的数据格式

Skill 通过 `POST /api/v1/logs/upload` 发送 JSON body：

```json
{
  "meta": {
    "logVersion": "2",
    "projectName": "one-design-next",
    "projectPath": "/Users/dev/projects/one-design-next",
    "platform": "cursor",
    "availableSources": ["realtime", "specstory", "agent-recall"]
  },
  "conversations": [
    {
      "role": "user",
      "content": "请帮我实现一个人群列表页面",
      "source": "realtime",
      "confidence": "high",
      "ts": "2026-04-17T14:30:00Z",
      "toolCalls": null
    },
    {
      "role": "assistant",
      "content": "好的，我来分析设计稿并实现...",
      "source": "realtime",
      "confidence": "high",
      "ts": "2026-04-17T14:35:00Z",
      "toolCalls": [{ "name": "design-analyst", "status": "completed" }]
    }
  ],
  "summary": "# 会话上下文摘要\n\n## 需求概述\n\n...",
  "environment": {
    "project": { "name": "one-design-next", "path": "...", "odnVersion": "2.1.0", "devServer": "localhost:3000" },
    "git": { "branch": "feat/crowd-list", "lastCommits": ["abc1234 feat: add CrowdList"], "status": "clean", "remoteUrl": "..." },
    "system": { "platform": "darwin", "nodeVersion": "v20.11.0", "npmVersion": "10.2.4" },
    "workspace": { "vscodeSettings": null, "cursorRules": null, "fileCount": "156" }
  },
  "artifacts": [
    { "path": "src/pages/CrowdList.tsx", "content": "import React...", "size": 2457, "collectedVia": "git-diff" }
  ],
  "screenshots": [
    { "filename": "001-design.png", "base64": "data:image/png;base64,...", "source": "realtime" }
  ],
  "dataQuality": {
    "items": [
      { "dimension": "对话历史", "path": "realtime", "status": "success", "count": 12, "coverage": "67%" },
      { "dimension": "截图", "path": "screenshots", "status": "success", "count": 3, "coverage": null }
    ]
  }
}
```

## 数据存储（Upstash Redis）

| Key 模式 | 类型 | 说明 |
|---------|------|------|
| `projects` | Set | 所有项目 ID 集合 |
| `project:{id}` | JSON | 项目详情 |
| `sessions:{projectId}` | Set | 某项目的所有会话 ID 集合 |
| `session:{id}` | JSON | 会话详情 |
| `conversations:{sessionId}` | JSON | 会话的对话历史数组 |
| `screenshots:{sessionId}` | JSON | 会话的截图数组 |
| `artifacts:{sessionId}` | JSON | 会话的产出文件数组 |

## API 接口

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| POST | `/api/v1/logs/upload` | 上传反馈数据 | Bearer Token |
| GET | `/api/v1/projects` | 获取所有项目列表 | — |
| GET | `/api/v1/projects/[projectId]` | 获取项目详情 + 会话列表 | — |
| GET | `/api/v1/sessions/[sessionId]` | 获取会话详情（含对话、截图等） | — |

## 部署到 Vercel

### 1. 创建 Upstash Redis

1. 前往 [Vercel Dashboard](https://vercel.com/dashboard) → Storage → Create → Redis (Upstash)
2. 或在 [Upstash Console](https://console.upstash.com/) 免费创建
3. 获取 `KV_REST_API_URL` 和 `KV_REST_API_TOKEN`

### 2. 部署项目

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel
```

### 3. 配置环境变量

在 Vercel Dashboard → Settings → Environment Variables 中添加：

- `KV_REST_API_URL` — Redis REST API 地址
- `KV_REST_API_TOKEN` — Redis REST API Token
- `API_SECRET_KEY` — 自定义密钥（Skill 端上传时携带）

### 4. Skill 端调用示例

```bash
curl -X POST https://your-app.vercel.app/api/v1/logs/upload \
  -H "Authorization: Bearer your-secret-key-here" \
  -H "Content-Type: application/json" \
  -d '{"meta":{"logVersion":"2","projectName":"test","projectPath":"/test","platform":"cursor","availableSources":["realtime"]},"conversations":[{"role":"user","content":"hello","source":"realtime","confidence":"high","ts":"2026-04-17T14:30:00Z"}],"summary":null,"environment":null,"artifacts":[],"screenshots":[],"dataQuality":{"items":[]}}'
```

## 本地开发

```bash
# 安装依赖
npm install

# 复制环境变量
cp .env.local.example .env.local
# 编辑 .env.local 填入 Upstash Redis 凭据

# 启动开发服务器
npm run dev
```

## 技术栈

- **框架**: Next.js 14 (App Router)
- **存储**: Upstash Redis (Serverless Redis)
- **UI**: Tailwind CSS + shadcn/ui 组件
- **部署**: Vercel
- **设计风格**: One Design Next 浅色简洁风
