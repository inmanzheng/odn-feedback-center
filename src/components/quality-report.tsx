import type { DataQualityReport } from "@/types";
import { CheckCircle, AlertCircle, XCircle } from "lucide-react";

const statusIcons = {
  success: <CheckCircle className="w-4 h-4 text-green-500" />,
  skipped: <AlertCircle className="w-4 h-4 text-yellow-500" />,
  failed: <XCircle className="w-4 h-4 text-red-500" />,
};

const statusLabels = {
  success: "成功",
  skipped: "跳过",
  failed: "失败",
};

export function QualityReport({ report }: { report: DataQualityReport }) {
  if (!report.items || report.items.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        暂无数据质量报告
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#F9FAFB] border-b border-border">
            <th className="text-left px-4 py-3 font-medium text-[#525252]">维度</th>
            <th className="text-left px-4 py-3 font-medium text-[#525252]">采集路径</th>
            <th className="text-left px-4 py-3 font-medium text-[#525252]">状态</th>
            <th className="text-left px-4 py-3 font-medium text-[#525252]">数量</th>
            <th className="text-left px-4 py-3 font-medium text-[#525252]">覆盖率</th>
          </tr>
        </thead>
        <tbody>
          {report.items.map((item, idx) => (
            <tr key={idx} className="border-b border-border last:border-b-0">
              <td className="px-4 py-3 text-foreground">{item.dimension}</td>
              <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{item.path}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  {statusIcons[item.status]}
                  <span className="text-xs">{statusLabels[item.status]}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-foreground">{item.count}</td>
              <td className="px-4 py-3 text-muted-foreground">{item.coverage || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
