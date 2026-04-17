"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";
import type { Project } from "@/types";
import { Monitor, GitBranch, Clock, MessageSquare, FileText } from "lucide-react";

const sourceColors: Record<string, "info" | "warning" | "secondary" | "success"> = {
  realtime: "info",
  specstory: "warning",
  "cursor-db": "secondary",
  "agent-recall": "success",
};

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/projects/${project.id}`}>
      <div className="bg-white border border-border rounded-lg p-5 hover:bg-[#F9FAFB] hover:border-[#D4D4D4] transition-all duration-150 cursor-pointer group">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-[#F5F5F5] flex items-center justify-center group-hover:bg-[#EBEBEB] transition-colors">
            <Monitor className="w-6 h-6 text-[#525252]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{project.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{project.platform}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            {project.totalSessions} 会话
          </span>
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {project.totalFeedbacks} 反馈
          </span>
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5 flex-wrap">
          {project.availableSources.map((source) => (
            <Badge key={source} variant={sourceColors[source] || "secondary"} className="text-[10px] px-1.5 py-0">
              {source}
            </Badge>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          {formatRelativeTime(project.lastActiveAt)}
        </div>

        {project.remoteUrl && (
          <div className="mt-2 flex items-center justify-center gap-1 text-[11px] text-muted-foreground truncate">
            <GitBranch className="w-3 h-3 flex-shrink-0" />
            <span className="truncate max-w-[160px]">{project.remoteUrl.replace("https://github.com/", "")}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
