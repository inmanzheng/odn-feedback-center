"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import type { Session } from "@/types";
import { MessageSquare, Zap, Trash2 } from "lucide-react";

function getQualityColor(items: Session["dataQuality"]["items"]): string {
  const hasFailure = items.some((i) => i.status === "failed");
  const hasSkipped = items.some((i) => i.status === "skipped");
  if (hasFailure) return "bg-red-500";
  if (hasSkipped) return "bg-yellow-500";
  return "bg-green-500";
}

export function SessionCard({
  session,
  projectId,
  onDelete,
}: {
  session: Session;
  projectId: string;
  onDelete?: (sessionId: string) => void;
}) {
  const qualityColor = getQualityColor(session.dataQuality.items);

  return (
    <div className="relative group">
      <Link href={`/projects/${projectId}/sessions/${session.id}`}>
        <div className="flex items-center gap-4 px-5 py-4 border-b border-border hover:bg-[#F9FAFB] transition-colors duration-150 cursor-pointer">
          <div className="flex-shrink-0 text-xs text-muted-foreground w-36">
            {formatDateTime(session.sessionTime)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {session.skillsUsed.map((skill) => (
                <Badge key={skill} variant="outline" className="text-[11px]">
                  <Zap className="w-3 h-3 mr-1" />
                  {skill}
                </Badge>
              ))}
            </div>
            {session.summaryMd && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                {session.summaryMd.split("\n").find((l) => l.trim() && !l.startsWith("#") && !l.startsWith(">"))?.trim() || ""}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageSquare className="w-3.5 h-3.5" />
              {session.conversationCount}
            </span>
            <div className={`w-2 h-2 rounded-full ${qualityColor}`} title="数据质量" />
          </div>
        </div>
      </Link>
      {onDelete && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(session.id);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-white border border-border text-muted-foreground hover:text-red-500 hover:border-red-300 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
          title="删除会话"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
