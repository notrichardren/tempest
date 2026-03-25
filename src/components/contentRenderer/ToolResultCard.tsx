import { memo, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ToolResultCardProps {
  title: string;
  icon: ReactNode;
  variant: string;
  toolUseId?: string;
  rightContent?: ReactNode;
  children: ReactNode;
}

/**
 * Terminal-style tool result card matching Claude Code's rendering:
 *   ⎿  result content
 */
export const ToolResultCard = memo(function ToolResultCard({
  children,
}: ToolResultCardProps) {
  return (
    <div className="mt-0.5 ml-[11px]">
      <div className={cn("flex items-start gap-1 text-[13px]")}>
        <span className="text-muted-foreground shrink-0 font-mono">&#x239F;</span>
        <div className="min-w-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
});
