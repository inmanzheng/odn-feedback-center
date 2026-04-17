import type { EnvironmentSnapshot } from "@/types";
import { Folder, GitBranch, Cpu, Layout } from "lucide-react";

const sectionConfig = [
  { key: "project" as const, label: "Project", icon: Folder },
  { key: "git" as const, label: "Git", icon: GitBranch },
  { key: "system" as const, label: "System", icon: Cpu },
  { key: "workspace" as const, label: "Workspace", icon: Layout },
];

export function EnvironmentInfo({ env }: { env: EnvironmentSnapshot | null }) {
  if (!env) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        暂无环境信息
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {sectionConfig.map(({ key, label, icon: Icon }) => {
        const data = env[key];
        if (!data) return null;

        const entries = Object.entries(data).filter(
          ([, v]) => v !== null && v !== undefined
        );

        return (
          <div key={key} className="border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Icon className="w-4 h-4 text-[#525252]" />
              <h4 className="text-sm font-medium text-foreground">{label}</h4>
            </div>
            <dl className="space-y-2">
              {entries.map(([k, v]) => (
                <div key={k} className="flex">
                  <dt className="text-xs text-muted-foreground w-28 flex-shrink-0">{k}</dt>
                  <dd className="text-xs text-foreground break-all">
                    {Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : String(v)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
    </div>
  );
}
