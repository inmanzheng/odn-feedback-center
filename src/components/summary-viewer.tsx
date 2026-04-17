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

function renderMarkdown(md: string) {
  const lines = md.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;
  let inTable = false;
  let tableRows: string[][] = [];
  let tableHeaders: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith("|")) {
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
      elements.push(renderTable(tableHeaders, tableRows, key++));
      inTable = false;
      tableHeaders = [];
      tableRows = [];
    }

    if (line.startsWith("# ")) {
      elements.push(<h1 key={key++} className="text-xl font-bold text-foreground mt-6 mb-3">{line.slice(2)}</h1>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={key++} className="text-base font-semibold text-foreground mt-5 mb-2">{line.slice(3)}</h2>);
    } else if (line.startsWith("### ")) {
      elements.push(<h3 key={key++} className="text-sm font-semibold text-foreground mt-4 mb-2">{line.slice(4)}</h3>);
    } else if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={key++} className="border-l-2 border-border pl-3 text-xs text-muted-foreground my-2 italic">
          {line.slice(2)}
        </blockquote>
      );
    } else if (line.startsWith("- ")) {
      elements.push(
        <li key={key++} className="text-sm text-foreground ml-4 list-disc my-0.5">
          {line.slice(2)}
        </li>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={key++} className="h-2" />);
    } else {
      elements.push(<p key={key++} className="text-sm text-foreground leading-relaxed my-1">{line}</p>);
    }
  }

  if (inTable) {
    elements.push(renderTable(tableHeaders, tableRows, key++));
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
