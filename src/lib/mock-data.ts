import type {
  Project,
  Session,
  Conversation,
  Screenshot,
  Artifact,
} from "@/types";

// ─── Mock Projects ──────────────────────────────────────

export const mockProjects: Project[] = [
  {
    id: "proj-001",
    userId: "user-mock-001",
    name: "one-design-next",
    path: "/Users/dev/projects/one-design-next",
    platform: "cursor",
    remoteUrl: "https://github.com/nicepkg/one-design-next",
    createdAt: "2026-04-10T08:00:00Z",
    lastActiveAt: "2026-04-17T14:30:00Z",
    totalSessions: 12,
    totalFeedbacks: 24,
    availableSources: ["realtime", "specstory", "agent-recall"],
  },
  {
    id: "proj-002",
    userId: "user-mock-001",
    name: "ad-platform-web",
    path: "/Users/dev/projects/ad-platform-web",
    platform: "cursor",
    remoteUrl: "https://github.com/nicepkg/ad-platform-web",
    createdAt: "2026-04-05T10:00:00Z",
    lastActiveAt: "2026-04-16T09:15:00Z",
    totalSessions: 8,
    totalFeedbacks: 15,
    availableSources: ["realtime", "cursor-db"],
  },
  {
    id: "proj-003",
    userId: "user-mock-002",
    name: "tad-design-system",
    path: "/Users/dev/projects/tad-design-system",
    platform: "cursor",
    remoteUrl: null,
    createdAt: "2026-03-20T12:00:00Z",
    lastActiveAt: "2026-04-15T16:45:00Z",
    totalSessions: 5,
    totalFeedbacks: 9,
    availableSources: ["specstory", "agent-recall"],
  },
  {
    id: "proj-004",
    userId: "user-mock-002",
    name: "feedback-website",
    path: "/Users/dev/projects/feedback-website",
    platform: "codebuddy",
    remoteUrl: "https://github.com/nicepkg/feedback-website",
    createdAt: "2026-04-17T10:00:00Z",
    lastActiveAt: "2026-04-17T16:00:00Z",
    totalSessions: 2,
    totalFeedbacks: 3,
    availableSources: ["realtime", "agent-recall"],
  },
];

// ─── Mock Sessions ──────────────────────────────────────

export const mockSessions: Record<string, Session[]> = {
  "proj-001": [
    {
      id: "sess-001",
      projectId: "proj-001",
      logVersion: "2",
      sessionTime: "2026-04-17T14:30:00Z",
      conversationCount: 18,
      skillsUsed: ["design-analyst", "figma-to-block"],
      dataQuality: {
        items: [
          { dimension: "对话历史", path: "realtime", status: "success", count: 12, coverage: "67%" },
          { dimension: "对话历史", path: "specstory", status: "success", count: 6, coverage: "33%" },
          { dimension: "截图", path: "screenshots", status: "success", count: 3, coverage: null },
          { dimension: "环境快照", path: "context/env", status: "success", count: 1, coverage: null },
        ],
      },
      summaryMd: "# 会话上下文摘要\n\n## 需求概述\n\n用户需要基于 Figma 设计稿实现一个人群列表页面（CrowdList），包含表格展示、筛选功能和批量操作。\n\n## 执行时间线\n\n| 时间 | 角色 | 事件 | 来源 |\n|------|------|------|------|\n| 14:30 | 用户 | 提出需求：实现人群列表页 | realtime |\n| 14:35 | AI | 执行 design-analyst，分析设计稿 | realtime |\n| 14:42 | AI | 执行 figma-to-block，生成 CrowdList.tsx | realtime |\n| 14:50 | 用户 | 要求调整表格样式为 striped | specstory |\n| 14:55 | AI | 修改 Table bordered→striped | specstory |\n\n## 涉及的 Skill\n\n| Skill | 来源 | 主要操作 |\n|-------|------|----------|\n| design-analyst | realtime | 分析了人群列表设计稿 |\n| figma-to-block | realtime | 生成了 CrowdList.tsx |\n\n## 产出文件\n\n| 文件 | 操作 | 大小 | 采集方式 |\n|------|------|------|----------|\n| src/pages/CrowdList.tsx | 新建+修改x3 | 2.4KB | git-diff |\n| src/pages/CrowdList.scss | 新建 | 0.8KB | log |\n\n## 用户遇到的问题\n\n- 表格横向滚动时列头未固定\n- 筛选组件的下拉选项加载缓慢\n\n## 环境信息\n\n- 项目：one-design-next | 分支：feat/crowd-list\n- one-design-next：2.1.0\n- Node：20.11.0 | 平台：Cursor\n\n## 数据质量报告\n\n| 维度 | 采集路径 | 状态 | 覆盖率 |\n|------|----------|------|--------|\n| 对话历史 | 后置总结日志 | ✅ 12轮 | 67% |\n| 对话历史 | SpecStory | ✅ 补充6轮 | 33% |\n| 截图 | 已有截图 | ✅ 3张 | — |\n| 环境快照 | 终端命令 | ✅ | — |",
      environment: {
        project: { name: "one-design-next", path: "/Users/dev/projects/one-design-next", odnVersion: "2.1.0", devServer: "localhost:3000" },
        git: { branch: "feat/crowd-list", lastCommits: ["abc1234 feat: add CrowdList page", "def5678 fix: table style"], status: "M src/pages/CrowdList.tsx", remoteUrl: "https://github.com/nicepkg/one-design-next" },
        system: { platform: "darwin", nodeVersion: "v20.11.0", npmVersion: "10.2.4" },
        workspace: { vscodeSettings: null, cursorRules: null, fileCount: 156 },
      },
      createdAt: "2026-04-17T14:30:00Z",
    },
    {
      id: "sess-002",
      projectId: "proj-001",
      logVersion: "2",
      sessionTime: "2026-04-16T10:00:00Z",
      conversationCount: 8,
      skillsUsed: ["design-analyst"],
      dataQuality: {
        items: [
          { dimension: "对话历史", path: "agent-recall", status: "success", count: 8, coverage: "100%" },
          { dimension: "截图", path: "screenshots", status: "failed", count: 0, coverage: null },
        ],
      },
      summaryMd: null,
      environment: null,
      createdAt: "2026-04-16T10:00:00Z",
    },
  ],
};

// ─── Mock Conversations ─────────────────────────────────

export const mockConversations: Record<string, Conversation[]> = {
  "sess-001": [
    { id: "conv-001", sessionId: "sess-001", turnIndex: 0, role: "user", content: "我需要根据 Figma 设计稿实现一个人群列表页面，包含表格、筛选和批量操作功能。设计稿链接已经在上面了。", source: "realtime", confidence: "high", toolCalls: null, ts: "2026-04-17T14:30:00Z" },
    { id: "conv-002", sessionId: "sess-001", turnIndex: 1, role: "assistant", content: "好的，我来分析设计稿并实现人群列表页面。\n\n首先让我分析设计稿的结构：\n\n1. **页面头部**：标题\"人群列表\" + 新建按钮\n2. **筛选区域**：名称搜索 + 状态筛选 + 创建时间范围\n3. **表格区域**：\n   - 复选框列\n   - 人群名称\n   - 人群ID\n   - 状态（标签样式）\n   - 覆盖人数\n   - 创建时间\n   - 操作（编辑/删除）\n4. **底部分页器**\n\n我将使用 One Design Next 的 Table、Input、Select、DateRangePicker、Button 等组件来实现。", source: "realtime", confidence: "high", toolCalls: [{ name: "design-analyst", status: "completed" }], ts: "2026-04-17T14:35:00Z" },
    { id: "conv-003", sessionId: "sess-001", turnIndex: 2, role: "user", content: "表格样式改成 striped 的吧，这样更容易区分行", source: "specstory", confidence: "high", toolCalls: null, ts: "2026-04-17T14:50:00Z" },
    { id: "conv-004", sessionId: "sess-001", turnIndex: 3, role: "assistant", content: "好的，我将表格的 `bordered` 属性改为 `striped`，这样奇偶行会有交替的背景色，更容易阅读。\n\n```tsx\n<Table striped columns={columns} dataSource={data} />\n```\n\n已修改 `src/pages/CrowdList.tsx`。", source: "specstory", confidence: "high", toolCalls: null, ts: "2026-04-17T14:55:00Z" },
    { id: "conv-005", sessionId: "sess-001", turnIndex: 4, role: "user", content: "表格横向滚动的时候列头没有固定住，能修一下吗？", source: "agent-recall", confidence: "medium", toolCalls: null, ts: "2026-04-17T15:10:00Z" },
    { id: "conv-006", sessionId: "sess-001", turnIndex: 5, role: "assistant", content: "我来给表格添加固定列头和固定左右列的功能：\n\n```tsx\n<Table\n  striped\n  sticky\n  scroll={{ x: 1200 }}\n  columns={columns}\n  dataSource={data}\n/>\n```\n\n同时给操作列添加了 `fixed: 'right'` 属性，确保操作按钮始终可见。", source: "agent-recall", confidence: "medium", toolCalls: null, ts: "2026-04-17T15:15:00Z" },
  ],
};

// ─── Mock Screenshots ───────────────────────────────────

export const mockScreenshots: Record<string, Screenshot[]> = {
  "sess-001": [
    { id: "ss-001", sessionId: "sess-001", filename: "001-design-figma.png", base64: "https://placehold.co/800x600/f5f5f5/525252?text=Figma+Design", source: "realtime", ts: "2026-04-17T14:32:00Z" },
    { id: "ss-002", sessionId: "sess-001", filename: "002-implementation.png", base64: "https://placehold.co/800x600/f5f5f5/525252?text=Implementation+Result", source: "realtime", ts: "2026-04-17T14:45:00Z" },
    { id: "ss-003", sessionId: "sess-001", filename: "003-final-state.png", base64: "https://placehold.co/800x600/f5f5f5/525252?text=Final+State", source: "realtime", ts: "2026-04-17T15:20:00Z" },
  ],
};

// ─── Mock Artifacts ─────────────────────────────────────

export const mockArtifacts: Record<string, Artifact[]> = {
  "sess-001": [
    { id: "art-001", sessionId: "sess-001", filePath: "src/pages/CrowdList.tsx", content: "import React from 'react';\nimport { Table, Button, Input } from 'one-design-next';\n\nexport default function CrowdList() {\n  // ... implementation\n}", size: 2457, collectedVia: "git-diff" },
    { id: "art-002", sessionId: "sess-001", filePath: "src/pages/CrowdList.scss", content: ".crowd-list {\n  padding: 24px;\n  \n  .header {\n    display: flex;\n    justify-content: space-between;\n  }\n}", size: 824, collectedVia: "log" },
  ],
};
