"use client";

import { Badge } from "@/components/ui/badge";
import type { Conversation } from "@/types";
import { User, Bot } from "lucide-react";

const sourceVariant: Record<string, "info" | "warning" | "secondary" | "success"> = {
  realtime: "info",
  specstory: "warning",
  "cursor-db": "secondary",
  "agent-recall": "success",
};

const confidenceLabel: Record<string, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

export function ConversationList({ conversations }: { conversations: Conversation[] }) {
  return (
    <div className="divide-y divide-border">
      {conversations.map((conv) => (
        <div
          key={conv.id}
          className={`px-5 py-4 ${conv.role === "assistant" ? "bg-[#F9FAFB]" : "bg-white"}`}
        >
          <div className="flex items-center gap-2 mb-2">
            {conv.role === "user" ? (
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#525252]" />
                <span className="text-xs font-medium text-[#525252]">用户</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-[#525252]" />
                <span className="text-xs font-medium text-[#525252]">AI</span>
              </div>
            )}
          </div>

          <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {renderContent(conv.content)}
          </div>

          <div className="flex items-center gap-2 mt-3">
            <Badge variant={sourceVariant[conv.source] || "secondary"} className="text-[10px]">
              {conv.source}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              置信度: {confidenceLabel[conv.confidence] || conv.confidence}
            </span>
            {conv.toolCalls && conv.toolCalls.length > 0 && (
              <Badge variant="outline" className="text-[10px]">
                {conv.toolCalls.length} 个工具调用
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function renderContent(content: string) {
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{content.slice(lastIndex, match.index)}</span>);
    }
    parts.push(
      <pre key={key++} className="bg-[#F5F5F5] border border-border rounded-md px-3 py-2 my-2 text-xs font-mono overflow-x-auto">
        <code>{match[2]}</code>
      </pre>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(<span key={key++}>{content.slice(lastIndex)}</span>);
  }

  return parts.length > 0 ? parts : content;
}
