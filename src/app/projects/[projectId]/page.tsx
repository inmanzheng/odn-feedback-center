"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { SessionCard } from "@/components/session-card";
import { mockProjects, mockSessions } from "@/lib/mock-data";
import { formatDateTime } from "@/lib/utils";
import { ChevronLeft, Monitor, GitBranch, Calendar } from "lucide-react";
import type { Project, Session } from "@/types";

const API_KEY = "odn-feedback-2026-secret";

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/projects/${projectId}`);
      const json = await res.json();
      if (json.success && json.data) {
        setProject(json.data.project);
        setSessions(json.data.sessions);
      } else {
        const mockProject = mockProjects.find((p) => p.id === projectId);
        setProject(mockProject ?? null);
        setSessions(mockSessions[projectId] ?? []);
      }
    } catch {
      const mockProject = mockProjects.find((p) => p.id === projectId);
      setProject(mockProject ?? null);
      setSessions(mockSessions[projectId] ?? []);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      if (!confirm("确认删除此会话及其所有对话、截图数据？此操作不可恢复。")) {
        return;
      }
      try {
        const res = await fetch(`/api/v1/sessions/${sessionId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${API_KEY}` },
        });
        const json = await res.json();
        if (json.success) {
          setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        } else {
          alert(`删除失败: ${json.error}`);
        }
      } catch {
        alert("删除请求失败，请稍后重试");
      }
    },
    []
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="animate-pulse">
          <div className="w-32 h-4 bg-[#F0F0F0] rounded mb-6" />
          <div className="w-48 h-7 bg-[#F0F0F0] rounded mb-2" />
          <div className="w-80 h-3 bg-[#F0F0F0] rounded mb-8" />
          <div className="border border-border rounded-lg bg-white overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border">
                <div className="w-32 h-3 bg-[#F0F0F0] rounded" />
                <div className="flex-1 h-4 bg-[#F0F0F0] rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <Link href="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ChevronLeft className="w-4 h-4" />
          返回项目列表
        </Link>
        <p className="text-muted-foreground">项目不存在</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <Link href="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ChevronLeft className="w-4 h-4" />
        返回项目列表
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Monitor className="w-3.5 h-3.5" />
            {project.platform}
          </span>
          {project.remoteUrl && (
            <span className="flex items-center gap-1">
              <GitBranch className="w-3.5 h-3.5" />
              {project.remoteUrl.replace("https://github.com/", "")}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            创建于 {formatDateTime(project.createdAt)}
          </span>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-sm font-medium text-[#525252] flex items-center gap-1.5">
          <span className="text-base">会话记录</span>
          <span className="text-muted-foreground font-normal">({sessions.length})</span>
        </h2>
      </div>

      <div className="border border-border rounded-lg bg-white overflow-hidden">
        {sessions.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            暂无会话记录
          </div>
        ) : (
          sessions.map((session) => (
            <SessionCard key={session.id} session={session} projectId={projectId} onDelete={handleDeleteSession} />
          ))
        )}
      </div>
    </div>
  );
}
