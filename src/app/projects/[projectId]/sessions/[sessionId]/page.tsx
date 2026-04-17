"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ConversationList } from "@/components/conversation-list";
import { ScreenshotGallery } from "@/components/screenshot-gallery";
import { QualityReport } from "@/components/quality-report";
import { EnvironmentInfo } from "@/components/environment-info";
import { SummaryViewer } from "@/components/summary-viewer";
import { Badge } from "@/components/ui/badge";
import {
  mockProjects,
  mockSessions,
  mockConversations,
  mockScreenshots,
} from "@/lib/mock-data";
import { formatDateTime } from "@/lib/utils";
import { ChevronLeft, MessageSquare } from "lucide-react";
import type { Session, Conversation, Screenshot } from "@/types";

export default function SessionDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<Session | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      // 并行请求 session 和项目数据，避免串行等待
      const [sessionRes, projRes] = await Promise.all([
        fetch(`/api/v1/sessions/${sessionId}`),
        fetch(`/api/v1/projects/${projectId}`),
      ]);
      const [sessionJson, projJson] = await Promise.all([
        sessionRes.json(),
        projRes.json(),
      ]);

      if (sessionJson.success) {
        setSession(sessionJson.data.session);
        setConversations(sessionJson.data.conversations ?? []);
        setScreenshots(sessionJson.data.screenshots ?? []);
      } else {
        fallbackToMock();
      }

      if (projJson.success) {
        setProjectName(projJson.data.project.name);
      }
    } catch {
      fallbackToMock();
    } finally {
      setLoading(false);
    }
  }, [sessionId, projectId]);

  function fallbackToMock() {
    const project = mockProjects.find((p) => p.id === projectId);
    setProjectName(project?.name ?? "");
    const sessions = mockSessions[projectId] ?? [];
    const s = sessions.find((s) => s.id === sessionId);
    setSession(s ?? null);
    setConversations(mockConversations[sessionId] ?? []);
    setScreenshots(mockScreenshots[sessionId] ?? []);
  }

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="animate-pulse">
          <div className="w-32 h-4 bg-[#F0F0F0] rounded mb-6" />
          <div className="w-64 h-6 bg-[#F0F0F0] rounded mb-8" />
          <div className="flex gap-4 mb-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-20 h-8 bg-[#F0F0F0] rounded" />
            ))}
          </div>
          <div className="border border-border rounded-lg bg-white p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-[#F0F0F0] rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <Link
          href={`/projects/${projectId}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          返回会话列表
        </Link>
        <p className="text-muted-foreground">会话不存在</p>
      </div>
    );
  }

  const hasFailure = session.dataQuality.items.some((i) => i.status === "failed");
  const hasSkipped = session.dataQuality.items.some((i) => i.status === "skipped");
  const qualityVariant = hasFailure ? "destructive" : hasSkipped ? "warning" : "success";
  const qualityLabel = hasFailure ? "部分失败" : hasSkipped ? "部分跳过" : "全部成功";

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <Link
        href={`/projects/${projectId}`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        {projectName || "返回"}
      </Link>

      <div className="flex items-center gap-3 mb-8 flex-wrap">
        <h1 className="text-xl font-bold text-foreground">
          {formatDateTime(session.sessionTime)}
        </h1>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare className="w-3.5 h-3.5" />
            {session.conversationCount} 轮对话
          </span>
          <Badge variant={qualityVariant} className="text-[10px]">
            {qualityLabel}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="conversations">
        <TabsList>
          <TabsTrigger value="conversations">对话历史</TabsTrigger>
          <TabsTrigger value="summary">摘要</TabsTrigger>
          <TabsTrigger value="screenshots">截图</TabsTrigger>
          <TabsTrigger value="environment">环境</TabsTrigger>
          <TabsTrigger value="quality">质量报告</TabsTrigger>
        </TabsList>

        <TabsContent value="conversations">
          {conversations.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              暂无对话记录
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden bg-white">
              <ConversationList conversations={conversations} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="summary">
          <div className="border border-border rounded-lg p-6 bg-white">
            <SummaryViewer markdown={session.summaryMd} />
          </div>
        </TabsContent>

        <TabsContent value="screenshots">
          <div className="border border-border rounded-lg p-5 bg-white">
            <ScreenshotGallery screenshots={screenshots} />
          </div>
        </TabsContent>

        <TabsContent value="environment">
          <EnvironmentInfo env={session.environment} />
        </TabsContent>

        <TabsContent value="quality">
          <QualityReport report={session.dataQuality} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
