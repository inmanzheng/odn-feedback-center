"use client";

import { useState, useEffect, useCallback } from "react";
import { ProjectCard } from "@/components/project-card";
import { mockProjects } from "@/lib/mock-data";
import { Search, LayoutGrid, Clock, TrendingUp } from "lucide-react";
import type { Project } from "@/types";

type FilterTab = "all" | "recent" | "most";

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/projects");
      const json = await res.json();
      if (json.success && json.data?.length > 0) {
        setProjects(json.data);
      } else {
        // KV 无数据时使用 mock 数据展示
        setProjects(mockProjects);
      }
    } catch {
      // API 不可用时 fallback 到 mock
      setProjects(mockProjects);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    if (activeTab === "recent") {
      return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
    }
    if (activeTab === "most") {
      return b.totalFeedbacks - a.totalFeedbacks;
    }
    return 0;
  });

  const totalSessions = projects.reduce((s, p) => s + p.totalSessions, 0);
  const totalFeedbacks = projects.reduce((s, p) => s + p.totalFeedbacks, 0);

  const tabs: { key: FilterTab; label: string; icon: React.ReactNode }[] = [
    { key: "all", label: "全部项目", icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { key: "recent", label: "最近活跃", icon: <Clock className="w-3.5 h-3.5" /> },
    { key: "most", label: "最多反馈", icon: <TrendingUp className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">ODN Feedback Center</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          收集、存储和可视化展示来自各平台 Feedback Skill 采集的上下文日志数据
        </p>
      </div>

      <div className="flex items-center gap-6 mb-6 text-sm text-muted-foreground">
        <span>{projects.length} 个项目</span>
        <span className="text-border">·</span>
        <span>{totalSessions} 个会话</span>
        <span className="text-border">·</span>
        <span>{totalFeedbacks} 次反馈</span>
      </div>

      <div className="flex items-center gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === tab.key
                ? "bg-foreground text-white"
                : "bg-white border border-border text-[#525252] hover:bg-[#F5F5F5]"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="搜索项目名称..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-border rounded-lg bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#D4D4D4] transition-colors"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-border rounded-lg p-5 animate-pulse">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-[#F0F0F0]" />
                <div className="w-24 h-4 bg-[#F0F0F0] rounded" />
                <div className="w-16 h-3 bg-[#F0F0F0] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sorted.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {!loading && sorted.length === 0 && (
        <div className="text-center py-20 text-muted-foreground text-sm">
          未找到匹配的项目
        </div>
      )}
    </div>
  );
}
