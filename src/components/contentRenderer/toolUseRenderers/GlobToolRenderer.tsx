import { memo } from "react";
import { ToolUseCard, ToolUsePropertyRow } from "./ToolUseCard";

interface GlobToolInput {
  pattern?: string;
  path?: string;
}

interface Props {
  toolId: string;
  input: GlobToolInput;
}

export const GlobToolRenderer = memo(function GlobToolRenderer({ toolId, input }: Props) {
  const summary = input.pattern
    ? input.path
      ? `${input.pattern} in ${input.path}`
      : input.pattern
    : "";

  return (
    <ToolUseCard
      title="Glob"
      icon={null}
      variant="file"
      toolId={toolId}
      summary={summary}
    >
      {input.path && (
        <ToolUsePropertyRow label="path">
          <code className="text-[12px] font-mono text-info break-all">{input.path}</code>
        </ToolUsePropertyRow>
      )}
    </ToolUseCard>
  );
});
