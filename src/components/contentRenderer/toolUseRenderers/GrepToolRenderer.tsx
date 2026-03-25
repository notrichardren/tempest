import { memo } from "react";
import { cn } from "@/lib/utils";
import { layout } from "@/components/renderers";
import { ToolUseCard, ToolUsePropertyRow } from "./ToolUseCard";

interface GrepToolInput {
  pattern?: string;
  path?: string;
  output_mode?: string;
  glob?: string;
  type?: string;
  "-i"?: boolean;
  "-n"?: boolean;
  "-A"?: number;
  "-B"?: number;
  "-C"?: number;
  head_limit?: number;
  multiline?: boolean;
}

interface Props {
  toolId: string;
  input: GrepToolInput;
}

export const GrepToolRenderer = memo(function GrepToolRenderer({ toolId, input }: Props) {
  const summary = [
    input.pattern ? `"${input.pattern}"` : "",
    input.path ? `in ${input.path}` : "",
  ].filter(Boolean).join(" ");

  const flags: string[] = [];
  if (input["-i"]) flags.push("-i");
  if (input.multiline) flags.push("--multiline");
  if (input["-A"] != null) flags.push(`-A ${input["-A"]}`);
  if (input["-B"] != null) flags.push(`-B ${input["-B"]}`);
  if (input["-C"] != null) flags.push(`-C ${input["-C"]}`);

  return (
    <ToolUseCard
      title="Grep"
      icon={null}
      variant="search"
      toolId={toolId}
      summary={summary}
    >
      <div className="space-y-1">
        {input.glob && (
          <ToolUsePropertyRow label="glob">
            <code className="text-[12px] font-mono text-foreground">{input.glob}</code>
          </ToolUsePropertyRow>
        )}
        {input.type && (
          <ToolUsePropertyRow label="type">
            <code className="text-[12px] font-mono text-foreground">{input.type}</code>
          </ToolUsePropertyRow>
        )}
        {flags.length > 0 && (
          <ToolUsePropertyRow label="flags">
            <div className="flex gap-1 flex-wrap">
              {flags.map((flag) => (
                <span key={flag} className={cn("px-1 py-0.5 font-mono", layout.smallText, "rounded bg-muted text-muted-foreground")}>
                  {flag}
                </span>
              ))}
            </div>
          </ToolUsePropertyRow>
        )}
      </div>
    </ToolUseCard>
  );
});
