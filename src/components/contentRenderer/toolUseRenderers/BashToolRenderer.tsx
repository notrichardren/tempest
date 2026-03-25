import { memo } from "react";
import { Highlight, themes } from "prism-react-renderer";
import { cn } from "@/lib/utils";
import { codeTheme } from "@/components/renderers";
import { useTheme } from "@/contexts/theme";
import { getPreStyles, getLineStyles, getTokenStyles } from "@/utils/prismStyles";
import { ToolUseCard } from "./ToolUseCard";

interface BashToolInput {
  command?: string;
  description?: string;
  timeout?: number;
  run_in_background?: boolean;
}

interface Props {
  toolId: string;
  input: BashToolInput;
}

export const BashToolRenderer = memo(function BashToolRenderer({ toolId, input }: Props) {
  const { isDarkMode } = useTheme();
  const command = input.command ?? "";

  // Summary: prefer description, fall back to command
  const summary = input.description || command;

  return (
    <ToolUseCard
      title="Bash"
      icon={null}
      variant="terminal"
      toolId={toolId}
      summary={summary}
    >
      {/* Show full command in expanded view */}
      <div className={cn("rounded-md overflow-hidden")}>
        <Highlight
          theme={isDarkMode ? themes.vsDark : themes.vsLight}
          code={command}
          language="bash"
        >
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className={className}
              style={getPreStyles(isDarkMode, style, {
                fontSize: codeTheme.fontSize,
                padding: codeTheme.padding,
                overflowX: "auto",
              })}
            >
              {tokens.map((line, i) => {
                const lineProps = getLineProps({ line });
                return (
                  <div key={i} {...lineProps} style={getLineStyles(lineProps.style)}>
                    {line.map((token, j) => {
                      const tokenProps = getTokenProps({ token });
                      return (
                        <span key={j} {...tokenProps} style={getTokenStyles(isDarkMode, tokenProps.style)} />
                      );
                    })}
                  </div>
                );
              })}
            </pre>
          )}
        </Highlight>
      </div>
      {input.run_in_background && (
        <span className="text-[11px] text-amber-500">Running in background</span>
      )}
    </ToolUseCard>
  );
});
