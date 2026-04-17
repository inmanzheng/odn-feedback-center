export interface ParsedSummary {
  overview: string;
  timeline: { time: string; role: string; event: string; source: string }[];
  skills: { name: string; source: string; action: string }[];
  files: { path: string; operation: string; size: string; method: string }[];
  issues: string[];
  environment: string;
  qualityReport: string;
  raw: string;
}

export function parseSummaryContent(markdown: string): ParsedSummary {
  const sections = splitSections(markdown);

  return {
    overview: extractSection(sections, "需求概述") || "",
    timeline: parseTimelineTable(extractSection(sections, "执行时间线") || ""),
    skills: parseSkillsTable(extractSection(sections, "涉及的 Skill") || ""),
    files: parseFilesTable(extractSection(sections, "产出文件") || ""),
    issues: parseList(extractSection(sections, "用户遇到的问题") || ""),
    environment: extractSection(sections, "环境信息") || "",
    qualityReport: extractSection(sections, "数据质量报告") || "",
    raw: markdown,
  };
}

function splitSections(md: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = md.split("\n");
  let currentHeading = "";
  let currentContent: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)/);
    if (headingMatch) {
      if (currentHeading) {
        sections[currentHeading] = currentContent.join("\n").trim();
      }
      currentHeading = headingMatch[1].trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }
  if (currentHeading) {
    sections[currentHeading] = currentContent.join("\n").trim();
  }
  return sections;
}

function extractSection(sections: Record<string, string>, key: string): string | null {
  for (const [k, v] of Object.entries(sections)) {
    if (k.includes(key)) return v;
  }
  return null;
}

function parseTimelineTable(content: string): ParsedSummary["timeline"] {
  return parseTable(content).map((row) => ({
    time: row[0] || "",
    role: row[1] || "",
    event: row[2] || "",
    source: row[3] || "",
  }));
}

function parseSkillsTable(content: string): ParsedSummary["skills"] {
  return parseTable(content).map((row) => ({
    name: row[0] || "",
    source: row[1] || "",
    action: row[2] || "",
  }));
}

function parseFilesTable(content: string): ParsedSummary["files"] {
  return parseTable(content).map((row) => ({
    path: row[0] || "",
    operation: row[1] || "",
    size: row[2] || "",
    method: row[3] || "",
  }));
}

function parseTable(content: string): string[][] {
  const lines = content.split("\n").filter((l) => l.trim().startsWith("|"));
  if (lines.length < 3) return [];

  return lines.slice(2).map((line) =>
    line
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean)
  );
}

function parseList(content: string): string[] {
  return content
    .split("\n")
    .filter((l) => l.trim().startsWith("-"))
    .map((l) => l.replace(/^-\s*/, "").trim())
    .filter(Boolean);
}
