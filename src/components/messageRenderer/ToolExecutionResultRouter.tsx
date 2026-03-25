import React from "react";
import { useTranslation } from "react-i18next";
import {
  ClaudeSessionHistoryRenderer,
  CodebaseContextRenderer,
  ErrorRenderer,
  GitWorkflowRenderer,
  MCPRenderer,
  StringRenderer,
  StructuredPatchRenderer,
  TerminalStreamRenderer,
  TodoUpdateRenderer,
  WebSearchRenderer,
  FileEditRenderer,
  ContentArrayRenderer,
  FileListRenderer,
  FallbackRenderer,
  TaskResultRenderer,
} from "../toolResultRenderer";
import { FileContent } from "../FileContent";
import { CommandOutputDisplay } from "./CommandOutputDisplay";
import { formatClaudeErrorOutput } from "../../utils/messageUtils";
import { cn } from "@/lib/utils";
import { AnsiText } from "../common/AnsiText";

function ResultWrapper({ children, isError }: { children: React.ReactNode; isError?: boolean }) {
  return (
    <div className="mt-0.5 ml-[11px]">
      <div className="flex items-start gap-1 text-[13px]">
        <span className={cn("shrink-0 font-mono", isError ? "text-destructive" : "text-muted-foreground")}>⎿</span>
        <div className="min-w-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

interface ToolExecutionResultRouterProps {
  toolResult: Record<string, unknown> | string | unknown[];
  searchQuery?: string;
  isCurrentMatch?: boolean;
  currentMatchIndex?: number;
}

export const ToolExecutionResultRouter: React.FC<
  ToolExecutionResultRouterProps
> = ({
  toolResult,
  searchQuery,
  isCurrentMatch = false,
  currentMatchIndex = 0,
}) => {
  const { t } = useTranslation();
  // Helper function to check if content is JSONL Claude session history
  const isClaudeSessionHistory = (content: string): boolean => {
    try {
      const lines = content
        .trim()
        .split("\n")
        .filter((line) => line.trim());

      // Need at least 2 lines to be considered chat history
      if (lines.length < 2) return false;

      let validChatMessages = 0;
      let totalValidJson = 0;

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          totalValidJson++;

          // Check if it looks like a Claude message
          if (
            parsed &&
            typeof parsed === "object" &&
            (parsed.type === "user" || parsed.type === "assistant") &&
            (parsed.message || parsed.content)
          ) {
            validChatMessages++;
          }
        } catch {
          // If we encounter non-JSON lines, it's probably not JSONL chat history
          return false;
        }
      }

      // Consider it chat history if:
      // 1. All lines are valid JSON
      // 2. At least 50% are valid chat messages
      // 3. Have at least 2 valid chat messages
      return (
        totalValidJson === lines.length &&
        validChatMessages >= 2 &&
        validChatMessages / totalValidJson >= 0.5
      );
    } catch {
      return false;
    }
  };

  // Handle array toolUseResult (e.g., [{type: "text", text: "..."}])
  if (Array.isArray(toolResult)) {
    return (
      <ResultWrapper>
        <ContentArrayRenderer toolResult={{ content: toolResult }} searchQuery={searchQuery} />
      </ResultWrapper>
    );
  }

  // Handle string toolUseResult first (like file trees, directory listings, errors)
  if (typeof toolResult === "string") {
    // Check if it's an error message
    if (toolResult.startsWith("Error: ")) {
      return (
        <ResultWrapper isError>
          <ErrorRenderer
            error={toolResult}
            searchQuery={searchQuery}
            isCurrentMatch={isCurrentMatch}
            currentMatchIndex={currentMatchIndex}
          />
        </ResultWrapper>
      );
    }

    // Check if string content is JSONL Claude session history
    if (isClaudeSessionHistory(toolResult)) {
      return (
        <ResultWrapper>
          <ClaudeSessionHistoryRenderer content={toolResult} />
        </ResultWrapper>
      );
    }

    return (
      <ResultWrapper>
        <StringRenderer result={toolResult} searchQuery={searchQuery} />
      </ResultWrapper>
    );
  }

  // Handle Claude Code specific formats first

  // Handle MCP tool results
  if (
    (toolResult.type === "mcp_tool_call" || toolResult.server) &&
    (toolResult.method || toolResult.function)
  ) {
    return (
      <ResultWrapper>
        <MCPRenderer
          mcpData={toolResult}
          searchQuery={searchQuery}
          isCurrentMatch={isCurrentMatch}
          currentMatchIndex={currentMatchIndex}
        />
      </ResultWrapper>
    );
  }

  // Handle codebase context
  if (
    toolResult.type === "codebase_context" ||
    toolResult.files_analyzed !== undefined ||
    toolResult.filesAnalyzed !== undefined ||
    toolResult.context_window !== undefined ||
    toolResult.contextWindow !== undefined
  ) {
    return (
      <ResultWrapper>
        <CodebaseContextRenderer
          contextData={toolResult}
          searchQuery={searchQuery}
          isCurrentMatch={isCurrentMatch}
          currentMatchIndex={currentMatchIndex}
        />
      </ResultWrapper>
    );
  }

  // Handle terminal stream output
  if (
    toolResult.type === "terminal_stream" ||
    (toolResult.command &&
      toolResult.output &&
      (toolResult.stream || toolResult.stdout || toolResult.stderr))
  ) {
    return (
      <ResultWrapper>
        <TerminalStreamRenderer
          command={toolResult.command as string}
          stream={toolResult.stream as string}
          output={toolResult.output as string}
          timestamp={toolResult.timestamp as string}
          exitCode={toolResult.exitCode as number}
          searchQuery={searchQuery}
          isCurrentMatch={isCurrentMatch}
          currentMatchIndex={currentMatchIndex}
        />
      </ResultWrapper>
    );
  }

  // Handle Git workflow results
  if (
    toolResult.type === "git_workflow" ||
    (toolResult.command &&
      typeof toolResult.command === "string" &&
      (String(toolResult.command).startsWith("git ") ||
        toolResult.git_command)) ||
    toolResult.status ||
    toolResult.diff ||
    toolResult.commit
  ) {
    return (
      <ResultWrapper>
        <GitWorkflowRenderer
          gitData={toolResult}
          searchQuery={searchQuery}
          isCurrentMatch={isCurrentMatch}
          currentMatchIndex={currentMatchIndex}
        />
      </ResultWrapper>
    );
  }

  // Handle web search results
  if (
    toolResult.query &&
    typeof toolResult.query === "string" &&
    Array.isArray(toolResult.results) &&
    toolResult.results.length > 0
  ) {
    // Additional check: first result often starts with "I'll search"
    const firstResult = toolResult.results[0];
    if (
      typeof firstResult === "string" &&
      (firstResult.includes("I'll search") || firstResult.includes("search"))
    ) {
      return (
        <ResultWrapper>
          <WebSearchRenderer
            searchData={toolResult}
            searchQuery={searchQuery}
            isCurrentMatch={isCurrentMatch}
            currentMatchIndex={currentMatchIndex}
          />
        </ResultWrapper>
      );
    }
    // Even without "I'll search", if it has query + results structure, treat as web search
    return (
      <ResultWrapper>
        <WebSearchRenderer
          searchData={toolResult}
          searchQuery={searchQuery}
          isCurrentMatch={isCurrentMatch}
          currentMatchIndex={currentMatchIndex}
        />
      </ResultWrapper>
    );
  }

  // Handle todo updates
  if (toolResult.newTodos !== undefined || toolResult.oldTodos !== undefined) {
    return (
      <ResultWrapper>
        <TodoUpdateRenderer
          todoData={toolResult}
          searchQuery={searchQuery}
          isCurrentMatch={isCurrentMatch}
          currentMatchIndex={currentMatchIndex}
        />
      </ResultWrapper>
    );
  }

  // Handle task operation results: {task: {id, subject, ...}} or {tasks: [...]} or {success, taskId, ...}
  if (
    (toolResult.task != null && typeof toolResult.task === "object") ||
    (Array.isArray(toolResult.tasks) && toolResult.tasks.length > 0) ||
    (toolResult.success != null && typeof toolResult.taskId === "string")
  ) {
    return (
      <ResultWrapper>
        <TaskResultRenderer toolResult={toolResult} />
      </ResultWrapper>
    );
  }

  // Handle file list results
  if (
    Array.isArray(toolResult.filenames) &&
    toolResult.filenames.length > 0 &&
    typeof toolResult.numFiles === "number"
  ) {
    return (
      <ResultWrapper>
        <FileListRenderer
          toolResult={toolResult}
          searchQuery={searchQuery}
          isCurrentMatch={isCurrentMatch}
          currentMatchIndex={currentMatchIndex}
        />
      </ResultWrapper>
    );
  }

  // Async agent task results are handled by MessageViewer's grouping logic
  // Return null here - ClaudeMessageNode handles rendering via agentTaskGroup prop
  // This includes both launch messages (isAsync: true) and completion messages (status: "completed")
  if (toolResult.agentId && typeof toolResult.agentId === "string") {
    // Launch message (isAsync: true) or completion message (status: "completed")
    if (toolResult.isAsync === true || toolResult.status === "completed") {
      return null;
    }
  }

  // Handle file object parsing
  if (toolResult.file && typeof toolResult.file === "object") {
    const fileData = toolResult.file as Record<string, unknown>;

    // Check if file content is JSONL Claude session history
    if (
      fileData.content &&
      typeof fileData.content === "string" &&
      isClaudeSessionHistory(fileData.content)
    ) {
      return (
        <ResultWrapper>
          <ClaudeSessionHistoryRenderer content={fileData.content} />
        </ResultWrapper>
      );
    }

    return (
      <ResultWrapper>
        <FileContent fileData={fileData} title={t("toolResult.fileContent")} searchQuery={searchQuery} />
      </ResultWrapper>
    );
  }

  // Handle file edit results
  if (
    toolResult.filePath &&
    typeof toolResult.filePath === "string" &&
    (toolResult.oldString || toolResult.newString || toolResult.originalFile)
  ) {
    return (
      <ResultWrapper>
        <FileEditRenderer toolResult={toolResult} searchQuery={searchQuery} />
      </ResultWrapper>
    );
  }

  // Handle structured patch results
  if (
    toolResult.structuredPatch &&
    Array.isArray(toolResult.structuredPatch) &&
    toolResult.filePath &&
    typeof toolResult.filePath === "string"
  ) {
    return (
      <ResultWrapper>
        <StructuredPatchRenderer toolResult={toolResult} />
      </ResultWrapper>
    );
  }

  // Handle direct content that might be JSONL Claude session history
  if (
    toolResult.content &&
    typeof toolResult.content === "string" &&
    isClaudeSessionHistory(toolResult.content)
  ) {
    return (
      <ResultWrapper>
        <ClaudeSessionHistoryRenderer content={toolResult.content} />
      </ResultWrapper>
    );
  }

  // Handle content array with text objects (Claude API response)
  if (Array.isArray(toolResult.content) && toolResult.content.length > 0) {
    return (
      <ResultWrapper>
        <ContentArrayRenderer toolResult={toolResult} searchQuery={searchQuery} />
      </ResultWrapper>
    );
  }

  // Handle direct content as string (non-chat history)
  if (
    toolResult.content &&
    typeof toolResult.content === "string" &&
    !toolResult.stdout &&
    !toolResult.stderr
  ) {
    return (
      <ResultWrapper>
        <StringRenderer result={toolResult.content} searchQuery={searchQuery} />
      </ResultWrapper>
    );
  }

  // Handle generic structured results with various properties
  const hasError =
    toolResult.stderr &&
    typeof toolResult.stderr === "string" &&
    toolResult.stderr.length > 0;
  const stdout = typeof toolResult.stdout === "string" ? toolResult.stdout : "";
  const stderr = typeof toolResult.stderr === "string" ? toolResult.stderr : "";
  const filePath =
    typeof toolResult.filePath === "string" ? toolResult.filePath : "";
  const interrupted =
    typeof toolResult.interrupted === "boolean" ? toolResult.interrupted : null;
  const isImage =
    typeof toolResult.isImage === "boolean" ? toolResult.isImage : null;

  // 메타데이터가 있는지 확인
  const hasMetadata = interrupted !== null || isImage !== null;
  const hasOutput =
    stdout.length > 0 || stderr.length > 0 || filePath.length > 0;

  // Handle completely generic objects (fallback)
  if (!hasOutput && !hasMetadata && Object.keys(toolResult).length > 0) {
    return (
      <ResultWrapper>
        <FallbackRenderer toolResult={toolResult} />
      </ResultWrapper>
    );
  }

  return (
    <ResultWrapper isError={hasError as boolean}>
      <div className="space-y-1">
        {/* 메타데이터 정보 */}
        {hasMetadata && (
          <div className="flex gap-3 text-xs">
            {interrupted !== null && (
              <span className={cn("font-medium", interrupted ? "text-warning" : "text-success")}>
                {interrupted ? t("toolResult.interrupted") : t("toolResult.completed")}
              </span>
            )}
            {isImage !== null && (
              <span className={cn("font-medium", isImage ? "text-info" : "text-muted-foreground")}>
                {isImage ? t("toolResult.included") : t("toolResult.none")}
              </span>
            )}
          </div>
        )}

        {stdout.length > 0 && (
          <CommandOutputDisplay stdout={stdout} />
        )}

        {stderr.length > 0 && (
          <pre className="text-xs whitespace-pre-wrap text-destructive">
            <AnsiText text={formatClaudeErrorOutput(stderr)} />
          </pre>
        )}

        {filePath.length > 0 && (
          <div className="text-xs text-muted-foreground">
            <code className="px-1 rounded bg-secondary text-foreground/80">
              {filePath}
            </code>
          </div>
        )}

        {/* 출력이 없을 때 상태 표시 */}
        {!hasOutput && hasMetadata && (
          <div className="text-xs text-muted-foreground">{t("toolResult.noOutput")}</div>
        )}

        {/* 완전히 빈 결과일 때 */}
        {!hasOutput && !hasMetadata && (
          <div className="text-xs text-muted-foreground">{t("toolResult.executionComplete")}</div>
        )}
      </div>
    </ResultWrapper>
  );
};
