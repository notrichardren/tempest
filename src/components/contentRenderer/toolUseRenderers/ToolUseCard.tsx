import { memo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { getVariantStyles, type RendererVariant } from "@/components/renderers";
import { useToggle } from "@/hooks";

interface ToolUseCardProps {
  title: string;
  icon: ReactNode;
  variant: RendererVariant;
  toolId?: string;
  /** Short summary shown in parens after the tool name: ⏺ ToolName(summary) */
  summary?: string;
  rightContent?: ReactNode;
  children: ReactNode;
}

/**
 * Terminal-style tool use card matching Claude Code's rendering:
 *
 *   ⏺ ToolName(summary_text)
 *     ⎿  [expanded detail content]
 */
export const ToolUseCard = memo(function ToolUseCard({
  title,
  variant,
  toolId,
  summary,
  children,
}: ToolUseCardProps) {
  const [isOpen, toggle] = useToggle(toolId ? `tooluse-${toolId}` : "tool-card");
  const styles = getVariantStyles(variant);

  const truncatedSummary = summary
    ? summary.length > 120
      ? summary.slice(0, 120) + "\u2026"
      : summary
    : "";

  return (
    <div className="mt-1">
      {/* Header: ⏺ ToolName(summary) */}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        className={cn(
          "flex items-start gap-1.5 text-left w-full",
          "hover:bg-muted/30 rounded-sm py-0.5 -mx-1 px-1 transition-colors"
        )}
      >
        <span className={cn("shrink-0 mt-px", styles.icon)}>&#x23FA;</span>
        <span className="text-[13px] font-mono min-w-0 break-all">
          <span className="font-semibold text-foreground">{title}</span>
          {truncatedSummary && (
            <span className="text-muted-foreground">
              ({truncatedSummary})
            </span>
          )}
        </span>
      </button>

      {/* Expanded content — indented with left border */}
      {isOpen && (
        <div className="ml-[11px] pl-3 border-l border-border/40 mt-0.5 pb-0.5 text-[13px]">
          {children}
        </div>
      )}
    </div>
  );
});

interface ToolUsePropertyRowProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function ToolUsePropertyRow({
  label,
  children,
  className,
}: ToolUsePropertyRowProps) {
  return (
    <div className={cn("flex items-start gap-2", className)}>
      <span className="text-[11px] text-muted-foreground shrink-0 pt-0.5">
        {label}:
      </span>
      {children}
    </div>
  );
}
