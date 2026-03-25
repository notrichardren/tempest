import { memo } from "react";
import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { layout } from "@/components/renderers";
import { ToolUseCard } from "./ToolUseCard";

interface WebFetchToolInput {
  url?: string;
  prompt?: string;
}

interface Props {
  toolId: string;
  input: WebFetchToolInput;
}

export const WebFetchToolRenderer = memo(function WebFetchToolRenderer({ toolId, input }: Props) {
  const { t } = useTranslation();

  return (
    <ToolUseCard
      title="WebFetch"
      icon={null}
      variant="web"
      toolId={toolId}
      summary={input.url}
    >
        {input.url && (
          <div className={cn("p-2 border bg-card border-border", layout.rounded, "mb-2")}>
            <div className={cn("flex items-center gap-1.5", layout.smallText, "text-muted-foreground mb-1")}>
              <ExternalLink className={layout.iconSizeSmall} />
              <span>URL</span>
            </div>
            <code className={cn(layout.bodyText, "font-mono text-info break-all")}>{input.url}</code>
          </div>
        )}
        {input.prompt && (
          <div className={cn("p-2 border bg-card border-border", layout.rounded)}>
            <div className={cn(layout.smallText, "text-muted-foreground mb-1")}>{t("taskOperation.prompt")}</div>
            <div className={cn(layout.bodyText, "text-foreground whitespace-pre-wrap")}>{input.prompt}</div>
          </div>
        )}
    </ToolUseCard>
  );
});
