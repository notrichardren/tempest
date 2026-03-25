import { memo } from "react";
import { cn } from "@/lib/utils";
import { layout } from "@/components/renderers";
import { ToolUseCard } from "./ToolUseCard";

interface ReadToolInput {
  file_path?: string;
  offset?: number;
  limit?: number;
}

interface Props {
  toolId: string;
  input: ReadToolInput;
}

export const ReadToolRenderer = memo(function ReadToolRenderer({ toolId, input }: Props) {
  const filePath = input.file_path ?? "";
  const hasRange = input.offset != null || input.limit != null;

  return (
    <ToolUseCard
      title="Read"
      icon={null}
      variant="code"
      toolId={toolId}
      summary={filePath}
    >
      {hasRange && (
        <div className={cn("flex items-center gap-3 text-muted-foreground", layout.smallText)}>
          {input.offset != null && <span>offset: {input.offset}</span>}
          {input.limit != null && <span>limit: {input.limit}</span>}
        </div>
      )}
    </ToolUseCard>
  );
});
