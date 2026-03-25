import { useMemo } from "react";
import type { ClaudeMessage } from "../../types";
import type { NavigatorEntryData } from "./types";
import { extractClaudeMessageContent } from "../../utils/messageUtils";

/** Content block types that are NOT user-visible text */
const NON_TEXT_TYPES = new Set([
  "tool_use",
  "tool_result",
  "thinking",
  "redacted_thinking",
  "server_tool_use",
  "mcp_tool_use",
  "mcp_tool_result",
]);

/** Strip XML tags from content for clean preview */
function stripXmlTags(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Truncate text to maxLength, respecting word boundaries when possible */
function truncatePreview(text: string, maxLength = 100): string {
  if (text.length <= maxLength) return text;
  // Use string.slice for Unicode safety (CJK characters)
  const truncated = text.slice(0, maxLength);
  // Try to break at last space
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > maxLength * 0.7) {
    return truncated.slice(0, lastSpace) + "…";
  }
  return truncated + "…";
}

/**
 * Check whether an assistant message carries at least one user-visible
 * text block (i.e. not just tool_use / thinking).
 */
function assistantHasTextContent(message: ClaudeMessage): boolean {
  const { content } = message;
  if (typeof content === "string" && content.trim().length > 0) return true;
  if (Array.isArray(content)) {
    return content.some(
      (block) =>
        typeof block === "object" &&
        block !== null &&
        "type" in block &&
        !NON_TEXT_TYPES.has(block.type as string)
    );
  }
  return false;
}

export function useNavigatorEntries(messages: ClaudeMessage[]): NavigatorEntryData[] {
  return useMemo(() => {
    if (!messages || messages.length === 0) return [];

    const entries: NavigatorEntryData[] = [];
    let turnIndex = 0;

    for (const message of messages) {
      // Only show user messages and assistant messages with text content
      if (message.type === "user") {
        // User messages with only tool_result content (no visible text) are noise
        if (Array.isArray(message.content)) {
          const hasVisibleContent = message.content.some(
            (block) =>
              typeof block === "object" &&
              block !== null &&
              "type" in block &&
              block.type === "text"
          );
          if (!hasVisibleContent) continue;
        }
      } else if (message.type === "assistant") {
        // Skip assistant messages that have no text content (tool-only or thinking-only)
        if (!assistantHasTextContent(message)) continue;
      } else if (message.type === "summary") {
        // Summary messages are kept as turn markers
      } else {
        // Skip system, progress, queue-operation, file-history-snapshot, and all other types
        continue;
      }

      // Extract preview text
      const rawContent = extractClaudeMessageContent(message);
      let preview = "";
      if (rawContent) {
        preview = truncatePreview(stripXmlTags(rawContent));
      }

      // Determine role
      const role = message.type === "user" || message.type === "assistant" || message.type === "summary"
        ? message.type
        : "system";

      turnIndex++;

      entries.push({
        uuid: message.uuid,
        role,
        preview: preview || `(${role} message)`,
        timestamp: message.timestamp || "",
        hasToolUse: false,
        turnIndex,
      });
    }

    return entries;
  }, [messages]);
}
