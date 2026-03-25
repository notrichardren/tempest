import { memo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { getVariantStyles, layout } from "@/components/renderers";
import { ToolUseCard } from "./ToolUseCard";

interface TaskOutputToolInput {
  task_id?: string;
  block?: boolean;
  timeout?: number;
}

interface Props {
  toolId: string;
  input: TaskOutputToolInput;
}

export const TaskOutputToolRenderer = memo(function TaskOutputToolRenderer({ toolId, input }: Props) {
  const { t } = useTranslation();
  const styles = getVariantStyles("task");

  const summary = input.task_id
    ? `task #${input.task_id}${input.block ? ", blocking" : ""}`
    : undefined;

  return (
    <ToolUseCard
      title="TaskOutput"
      icon={null}
      variant="task"
      toolId={toolId}
      summary={summary}
      rightContent={
        input.task_id ? (
          <span className={cn("px-1.5 py-0.5 font-mono", layout.rounded, styles.badge, styles.badgeText)}>
            {t("renderers.taskOutputToolRenderer.task")} {input.task_id}
          </span>
        ) : undefined
      }
    >
        <div className={cn("flex items-center gap-3", layout.smallText, "text-muted-foreground")}>
          {input.block != null && (
            <span>{t("renderers.taskOutputToolRenderer.block")}: <code className="text-foreground">{String(input.block)}</code></span>
          )}
          {input.timeout != null && (
            <span>{t("renderers.taskOutputToolRenderer.timeout")}: <code className="text-foreground">{(input.timeout / 1000).toFixed(0)}{t("time.secondShort")}</code></span>
          )}
        </div>
    </ToolUseCard>
  );
});
