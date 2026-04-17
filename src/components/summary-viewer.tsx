export function SummaryViewer({ markdown }: { markdown: string | null }) {
  if (!markdown) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        暂无上下文摘要
      </div>
    );
  }

  return (
    <div className="prose prose-sm max-w-none">
      {renderMarkdown(markdown)}
    </div>
  );
}

/** 内联格式化：加粗、斜体、内联代码、链接 */
function renderInline(text: string): React.ReactNode[] {
  // 将内联 Markdown 语法转换为 React 元素
  const parts: React.ReactNode[] = [];
  // 匹配: **bold**, *italic*, `code`, [text](url)
  const inlineRegex = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = inlineRegex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index));
    }
    if (match[2]) {
      // **bold**
      parts.push(<strong key={key++} className="font-semibold">{match[2]}</strong>);
    } else if (match[3]) {
      // *italic*
      parts.push(<em key={key++}>{match[3]}</em>);
    } else if (match[4]) {
      // `code`
      parts.push(
        <code key={key++} className="bg-[#F5F5F5] border border-border rounded px-1 py-0.5 text-xs font-mono">
          {match[4]}
        </code>
      );
    } else if (match[5] && match[6]) {
      // [text](url)
      parts.push(
        <a key={key++} href={match[6]} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
          {match[5]}
        </a>
      );
    }
    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }

  return parts.length > 0 ? parts : [text];
}

function renderMarkdown(md: string) {
  const lines = md.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;
  let inTable = false;
  let tableRows: string[][] = [];
  let tableHeaders: string[] = [];
  let inCodeBlock = false;
  let codeLang = "";
  let codeLines: string[] = [];
  let listItems: React.ReactNode[] = [];

  function flushList() {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key++} className="list-disc ml-4 my-2 space-y-0.5">
          {listItems}
        </ul>
      );
      listItems = [];
    }
  }

  function flushTable() {
    if (inTable) {
      elements.push(renderTable(tableHeaders, tableRows, key++));
      inTable = false;
      tableHeaders = [];
      tableRows = [];
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 代码块处理
    if (line.trim().startsWith("```")) {
      if (!inCodeBlock) {
        flushList();
        flushTable();
        inCodeBlock = true;
        codeLang = line.trim().slice(3).trim();
        codeLines = [];
      } else {
        // 结束代码块
        elements.push(
          <pre key={key++} className="bg-[#F5F5F5] border border-border rounded-md px-3 py-2 my-2 text-xs font-mono overflow-x-auto">
            <code>{codeLines.join("\n")}</code>
          </pre>
        );
        inCodeBlock = false;
        codeLang = "";
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // 表格处理
    if (line.trim().startsWith("|")) {
      flushList();
      if (!inTable) {
        inTable = true;
        tableHeaders = parsePipeRow(line);
        continue;
      }
      if (line.includes("---")) continue;
      tableRows.push(parsePipeRow(line));
      continue;
    }

    if (inTable) {
      flushTable();
    }

    // 列表项
    if (line.startsWith("- ")) {
      listItems.push(
        <li key={key++} className="text-sm text-foreground">
          {renderInline(line.slice(2))}
        </li>
      );
      continue;
    }

    // 如果不是列表项，先 flush 列表
    flushList();

    if (line.startsWith("# ")) {
      elements.push(<h1 key={key++} className="text-xl font-bold text-foreground mt-6 mb-3">{renderInline(line.slice(2))}</h1>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={key++} className="text-base font-semibold text-foreground mt-5 mb-2">{renderInline(line.slice(3))}</h2>);
    } else if (line.startsWith("### ")) {
      elements.push(<h3 key={key++} className="text-sm font-semibold text-foreground mt-4 mb-2">{renderInline(line.slice(4))}</h3>);
    } else if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={key++} className="border-l-2 border-border pl-3 text-xs text-muted-foreground my-2 italic">
          {renderInline(line.slice(2))}
        </blockquote>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={key++} className="h-2" />);
    } else {
      elements.push(<p key={key++} className="text-sm text-foreground leading-relaxed my-1">{renderInline(line)}</p>);
    }
  }

  // Flush remaining
  flushList();
  flushTable();

  // 未关闭的代码块也要输出
  if (inCodeBlock && codeLines.length > 0) {
    elements.push(
      <pre key={key++} className="bg-[#F5F5F5] border border-border rounded-md px-3 py-2 my-2 text-xs font-mono overflow-x-auto">
        <code>{codeLines.join("\n")}</code>
      </pre>
    );
  }

  return <div>{elements}</div>;
}

function parsePipeRow(line: string): string[] {
  return line.split("|").map((c) => c.trim()).filter(Boolean);
}

function renderTable(headers: string[], rows: string[][], key: number) {
  return (
    <div key={key} className="border border-border rounded-lg overflow-hidden my-3">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-[#F9FAFB] border-b border-border">
            {headers.map((h, i) => (
              <th key={i} className="text-left px-3 py-2 font-medium text-[#525252]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-border last:border-b-0">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 text-foreground">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
