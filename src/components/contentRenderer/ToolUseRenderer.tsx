"use client";

import { memo } from "react";

/**
 * ToolUseRenderer - Renders Claude tool use content
 *
 * Handles different tool types:
 * - Write: File creation with syntax highlighting
 * - Edit: File modification (delegates to FileEditRenderer)
 * - Task: Assistant prompts with description/instructions
 * - Default: Generic tool input display
 */

import { Highlight, themes } from "prism-react-renderer";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/theme";
import { FileEditRenderer } from "../toolResultRenderer/FileEditRenderer";
import { MCPToolUseRenderer } from "./MCPToolUseRenderer";
import { getToolVariant } from "@/utils/toolIconUtils";
import {
  type BaseRendererProps,
  getLanguageFromPath,
  codeTheme,
} from "../renderers";
import { getPreStyles, getLineStyles, getTokenStyles } from "@/utils/prismStyles";
import { ToolUseCard } from "./toolUseRenderers/ToolUseCard";
import {
  ReadToolRenderer,
  BashToolRenderer,
  GlobToolRenderer,
  GrepToolRenderer,
  WebFetchToolRenderer,
  WebSearchToolRenderer,
  MultiEditToolRenderer,
  TodoWriteToolRenderer,
  NotebookEditToolRenderer,
  TaskCreateToolRenderer,
  TaskUpdateToolRenderer,
  TaskOutputToolRenderer,
  TaskToolRenderer,
  ApplyPatchToolRenderer,
  UpdatePlanToolRenderer,
} from "./toolUseRenderers";

interface ToolUseRendererProps extends BaseRendererProps {
  toolUse: Record<string, unknown>;
}

export const ToolUseRenderer = memo(function ToolUseRenderer({
  toolUse,
}: ToolUseRendererProps) {
  const { isDarkMode } = useTheme();

  const toolName = (toolUse.name as string) || "Unknown Tool";
  const toolId = (toolUse.id as string) || "";
  const toolInput = (toolUse.input as Record<string, unknown>) ?? {};

  const parseMcpTool = (name: string) => {
    if (!name.startsWith("mcp__")) {
      return null;
    }
    const rest = name.slice(5);
    const separatorIndex = rest.indexOf("__");
    if (separatorIndex < 0) {
      return { serverName: "mcp", toolName: rest };
    }
    return {
      serverName: rest.slice(0, separatorIndex),
      toolName: rest.slice(separatorIndex + 2),
    };
  };

  // Get variant styles based on tool type
  const variant = getToolVariant(toolName);

  // === Named Tool Renderers ===
  switch (toolName) {
    case "Read":
      return <ReadToolRenderer toolId={toolId} input={toolInput} />;
    case "Bash":
      return <BashToolRenderer toolId={toolId} input={toolInput} />;
    case "Glob":
      return <GlobToolRenderer toolId={toolId} input={toolInput} />;
    case "Grep":
      return <GrepToolRenderer toolId={toolId} input={toolInput} />;
    case "WebFetch":
      return <WebFetchToolRenderer toolId={toolId} input={toolInput} />;
    case "WebSearch":
      return <WebSearchToolRenderer toolId={toolId} input={toolInput} />;
    case "MultiEdit":
      return <MultiEditToolRenderer toolId={toolId} input={toolInput} />;
    case "TodoWrite":
      return <TodoWriteToolRenderer toolId={toolId} input={toolInput} />;
    case "NotebookEdit":
      return <NotebookEditToolRenderer toolId={toolId} input={toolInput} />;
    case "TaskCreate":
      return <TaskCreateToolRenderer toolId={toolId} input={toolInput} />;
    case "TaskUpdate":
      return <TaskUpdateToolRenderer toolId={toolId} input={toolInput} />;
    case "TaskOutput":
      return <TaskOutputToolRenderer toolId={toolId} input={toolInput} />;
    case "Task":
      return <TaskToolRenderer toolId={toolId} input={toolInput} />;
    case "apply_patch":
      return <ApplyPatchToolRenderer toolId={toolId} input={toolInput} />;
    case "update_plan":
      return <UpdatePlanToolRenderer toolId={toolId} input={toolInput} />;
  }

  const mcpTool = parseMcpTool(toolName);
  if (mcpTool) {
    return (
      <MCPToolUseRenderer
        id={toolId}
        serverName={mcpTool.serverName}
        toolName={mcpTool.toolName}
        input={toolInput}
      />
    );
  }

  // Helper to check if toolInput is a non-null object
  const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

  // Check tool types (fallback for input-shape detection)
  const isWriteTool =
    toolName === "Write" ||
    (isObject(toolInput) && "file_path" in toolInput && "content" in toolInput);

  const isEditTool =
    toolName === "Edit" ||
    (isObject(toolInput) &&
      "file_path" in toolInput &&
      "old_string" in toolInput &&
      "new_string" in toolInput);

  const isAssistantPrompt =
    isObject(toolInput) &&
    "description" in toolInput &&
    "prompt" in toolInput &&
    typeof toolInput.description === "string" &&
    typeof toolInput.prompt === "string";

  // === Write Tool Renderer ===
  if (isWriteTool) {
    const filePath = typeof toolInput.file_path === "string" ? toolInput.file_path : "";
    const content = typeof toolInput.content === "string" ? toolInput.content : "";
    const language = getLanguageFromPath(filePath);

    return (
      <ToolUseCard title="Write" icon={null} variant="success" toolId={toolId} summary={filePath}>
        <div className={cn(layout.rounded, "overflow-auto max-h-64")}>
          <Highlight
            theme={isDarkMode ? themes.vsDark : themes.vsLight}
            code={content}
            language={language}
          >
            {({ className, style, tokens, getLineProps, getTokenProps }) => (
              <pre
                className={className}
                style={getPreStyles(isDarkMode, style, {
                  fontSize: codeTheme.fontSize,
                  padding: codeTheme.padding,
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
      </ToolUseCard>
    );
  }

  // === Edit Tool Renderer ===
  if (isEditTool) {
    const filePath = typeof toolInput.file_path === "string" ? toolInput.file_path : "";
    const oldString = typeof toolInput.old_string === "string" ? toolInput.old_string : "";
    const newString = typeof toolInput.new_string === "string" ? toolInput.new_string : "";
    const replaceAll = (toolInput.replace_all as boolean) || false;

    return (
      <FileEditRenderer
        toolResult={{
          filePath,
          oldString,
          newString,
          replaceAll,
          originalFile: "",
          userModified: false,
        }}
      />
    );
  }

  // === Assistant Prompt Renderer ===
  if (isAssistantPrompt) {
    const promptInput = toolInput as { description: string; prompt: string };

    return (
      <ToolUseCard title="Agent" icon={null} variant="info" toolId={toolId} summary={promptInput.description}>
        <div className="whitespace-pre-wrap text-[12px] leading-relaxed text-muted-foreground max-h-64 overflow-y-auto">
          {promptInput.prompt}
        </div>
      </ToolUseCard>
    );
  }

  // === Default Tool Renderer ===
  const inputSummary = (() => {
    const keys = Object.keys(toolInput);
    if (keys.length === 0) return "";
    const first = toolInput[keys[0]];
    if (typeof first === "string") return first.slice(0, 100);
    return JSON.stringify(toolInput).slice(0, 100);
  })();

  return (
    <ToolUseCard title={toolName} icon={null} variant={variant} toolId={toolId} summary={inputSummary}>
      <div className={cn(layout.rounded, "overflow-auto max-h-64")}>
        <Highlight
          theme={isDarkMode ? themes.vsDark : themes.vsLight}
          code={JSON.stringify(toolInput, null, 2)}
          language="json"
        >
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className={className}
              style={getPreStyles(isDarkMode, style, {
                fontSize: codeTheme.fontSize,
                padding: codeTheme.padding,
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
    </ToolUseCard>
  );
});
