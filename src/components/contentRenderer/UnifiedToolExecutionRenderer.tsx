import { memo } from "react";
import { cn } from "@/lib/utils";
import { useToggle } from "@/hooks";
const PREVIEW_MAX_LEN = 6000;

type ToolResultLike = Record<string, unknown>;

interface Props {
  toolUse: Record<string, unknown>;
  toolResults: ToolResultLike[];
}

const truncateText = (text: string) =>
  text.length <= PREVIEW_MAX_LEN ? text : `${text.slice(0, PREVIEW_MAX_LEN)}\n...`;

const stringifyPreview = (value: unknown) => {
  if (typeof value === "string") return truncateText(value);
  try { return truncateText(JSON.stringify(value, null, 2)); } catch { return String(value); }
};

function getToolSummary(toolName: string, input: Record<string, unknown>): string {
  if (typeof input.command === "string") return input.command;
  if (typeof input.file_path === "string") return input.file_path;
  if (typeof input.pattern === "string") return input.pattern;
  if (typeof input.query === "string") return input.query;
  if (typeof input.description === "string") return input.description;
  if (typeof input.url === "string") return input.url;
  const s = JSON.stringify(input);
  return s.length > 120 ? s.slice(0, 120) + "\u2026" : s;
}

export const UnifiedToolExecutionRenderer = memo(function UnifiedToolExecutionRenderer({
  toolUse,
  toolResults,
}: Props) {
  const toolName = (toolUse.name as string) || "Unknown";
  const toolId = (toolUse.id as string) || "";
  const toolInput = (toolUse.input as Record<string, unknown>) ?? {};
  const [isOpen, toggle] = useToggle(toolId ? `unified-${toolId}` : "unified-tool");

  const summary = getToolSummary(toolName, toolInput);
  const truncatedSummary = summary.length > 120 ? summary.slice(0, 120) + "\u2026" : summary;

  const hasError = toolResults.some((r) => r.is_error === true);

  return (
    <div className="mt-1">
      {/* Header: dot + ToolName(summary) */}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        className="flex items-start gap-1.5 text-left w-full hover:bg-muted/30 rounded-sm py-0.5 -mx-1 px-1 transition-colors"
      >
        <span className={cn("w-3 h-3 rounded-full shrink-0 mt-1", hasError ? "bg-destructive/60" : "bg-muted-foreground/60")} />
        <span className="text-[13px] font-mono min-w-0 break-all">
          <span className="font-semibold text-foreground">{toolName}</span>
          {truncatedSummary && (
            <span className="text-muted-foreground">({truncatedSummary})</span>
          )}
        </span>
      </button>

      {/* Expanded: input + results with left border */}
      {isOpen && (
        <div className="ml-[11px] pl-3 border-l border-border/40 mt-0.5 pb-0.5 text-[13px] space-y-2">
          <pre className="font-mono text-[12px] p-2 bg-secondary text-foreground rounded overflow-x-auto whitespace-pre-wrap max-h-64">
            {stringifyPreview(toolInput)}
          </pre>
          {toolResults.map((result, idx) => (
            <pre key={idx} className={cn(
              "font-mono text-[12px] p-2 rounded overflow-x-auto whitespace-pre-wrap max-h-64",
              hasError ? "bg-destructive/10 text-destructive" : "bg-secondary text-foreground"
            )}>
              {stringifyPreview(result.content)}
            </pre>
          ))}
        </div>
      )}
    </div>
  );
});
