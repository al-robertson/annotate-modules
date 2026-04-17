import { useState, useEffect } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import CopyButton from "./CopyButton";
import { MODULES_BASE_URL } from "../config";

// Strip background from all oneDark token styles
const cleanTheme = Object.fromEntries(
  Object.entries(oneDark).map(([key, value]) => {
    if (typeof value === "object" && value !== null && "background" in value) {
      const { background, ...rest } = value as Record<string, unknown>;
      return [key, rest];
    }
    return [key, value];
  })
);

interface ModuleCodePanelProps {
  moduleId: string;
  file: string;
  addedLines?: number[];
  removedLines?: number[];
}

const EXT_TO_LANG: Record<string, string> = {
  py: "python", ts: "typescript", tsx: "tsx", js: "javascript", jsx: "jsx",
  json: "json", yaml: "yaml", yml: "yaml", md: "markdown", sh: "bash",
  css: "css", html: "html", sql: "sql", toml: "toml", rs: "rust",
  go: "go", java: "java", rb: "ruby", dockerfile: "docker",
};

function detectLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (filename.toLowerCase() === "dockerfile") return "docker";
  return EXT_TO_LANG[ext] || "text";
}

export default function ModuleCodePanel({
  moduleId,
  file,
  addedLines,
  removedLines,
}: ModuleCodePanelProps) {
  const [code, setCode] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const addedSet = new Set(addedLines || []);
  const removedSet = new Set(removedLines || []);
  const hasDiff = addedSet.size > 0 || removedSet.size > 0;

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${MODULES_BASE_URL}/${moduleId}/files/${file}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load ${file} (${res.status})`);
        return res.text();
      })
      .then((text) => {
        setCode(text);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [moduleId, file]);

  // ... loading and error states ...

  const language = detectLanguage(file);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400 font-mono">{file}</span>
          {hasDiff && (
            <span className="flex items-center gap-2 text-xs">
              <span className="text-emerald-400">+{addedSet.size} lines</span>
              {removedSet.size > 0 && (
                <span className="text-red-400">-{removedSet.size} lines</span>
              )}
            </span>
          )}
        </div>
        <CopyButton text={code} />
      </div>
      <div className="flex-1 overflow-auto">
        <SyntaxHighlighter
          style={cleanTheme}
          language={language}
          showLineNumbers
          wrapLines
          lineProps={(lineNumber: number) => {
            const style: React.CSSProperties = { display: "block" };
            if (addedSet.has(lineNumber)) {
              style.backgroundColor = "rgba(34, 197, 94, 0.12)";
              style.borderLeft = "3px solid #22c55e";
              style.paddingLeft = "0.5rem";
            } else if (removedSet.has(lineNumber)) {
              style.backgroundColor = "rgba(239, 68, 68, 0.12)";
              style.borderLeft = "3px solid #ef4444";
              style.paddingLeft = "0.5rem";
            }
            return { style };
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
