#!/usr/bin/env node
/**
 * Tempest — Lightweight API server for Claude Code History Viewer
 * Reads ~/.claude/projects/ and serves the same endpoints as the Tauri backend.
 * No Rust required. Serves the built frontend from dist/.
 *
 * Usage: node api-server.mjs [--port 4523] [--host 0.0.0.0]
 */

import { createServer } from "http";
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, basename, extname, resolve } from "path";
import { homedir } from "os";
import { createReadStream } from "fs";

const CLAUDE_DIR = join(homedir(), ".claude");
const PROJECTS_DIR = join(CLAUDE_DIR, "projects");
const DIST_DIR = resolve(import.meta.dirname, "dist");

const cliArgs = process.argv.slice(2);
const portIdx = cliArgs.indexOf("--port");
const hostIdx = cliArgs.indexOf("--host");
const PORT = portIdx >= 0 ? parseInt(cliArgs[portIdx + 1], 10) : 4523;
const HOST = hostIdx >= 0 ? cliArgs[hostIdx + 1] : "0.0.0.0";

// ── Helpers ──

function decodeProjectPath(encoded) {
  return "/" + encoded.replace(/^-/, "").replace(/-/g, "/");
}

function getCwdFromFile(filePath) {
  try {
    const content = readFileSync(filePath, "utf8");
    for (const line of content.split("\n")) {
      if (!line.trim()) continue;
      const data = JSON.parse(line);
      if (data.cwd) return data.cwd;
    }
  } catch {}
  return null;
}

function getSessionSummary(filePath) {
  try {
    const content = readFileSync(filePath, "utf8");
    for (const line of content.split("\n")) {
      if (!line.trim()) continue;
      const data = JSON.parse(line);
      if (data.type === "user" && data.message?.role === "user") {
        const c = data.message.content;
        if (typeof c === "string") return c.slice(0, 300);
        if (Array.isArray(c)) {
          const text = c.find((b) => b.type === "text");
          if (text?.text) return text.text.slice(0, 300);
        }
      }
    }
  } catch {}
  return null;
}

function loadSessionCache(projectDir) {
  for (const name of [".session_cache.json", "sessions-index.json"]) {
    const p = join(projectDir, name);
    if (existsSync(p)) {
      try {
        return JSON.parse(readFileSync(p, "utf8"));
      } catch {}
    }
  }
  return null;
}

// ── API Handlers ──

const handlers = {
  get_claude_folder_path: () => CLAUDE_DIR,
  validate_claude_folder: () => true,
  detect_providers: () => [{ id: "claude", name: "Claude Code", is_available: true, session_count: 0 }],

  scan_projects: ({ claudePath } = {}) => {
    const dir = claudePath ? join(claudePath, "projects") : PROJECTS_DIR;
    if (!existsSync(dir)) return [];
    const projects = [];
    for (const name of readdirSync(dir)) {
      const projectDir = join(dir, name);
      try { if (!statSync(projectDir).isDirectory()) continue; } catch { continue; }
      const jsonlFiles = readdirSync(projectDir).filter((f) => f.endsWith(".jsonl"));
      if (jsonlFiles.length === 0) continue;
      const realPath = getCwdFromFile(join(projectDir, jsonlFiles[0])) || decodeProjectPath(name);
      const stats = jsonlFiles.map((f) => { try { return statSync(join(projectDir, f)).mtimeMs; } catch { return 0; } });
      const lastMod = new Date(Math.max(...stats)).toISOString();
      const msgCount = jsonlFiles.reduce((sum, f) => {
        try { return sum + readFileSync(join(projectDir, f), "utf8").split("\n").filter(Boolean).length; } catch { return sum; }
      }, 0);
      projects.push({
        name: basename(realPath),
        path: join(dir, name),
        actual_path: realPath,
        session_count: jsonlFiles.length,
        message_count: msgCount,
        last_modified: lastMod,
        provider: "claude",
      });
    }
    projects.sort((a, b) => new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime());
    return projects;
  },

  scan_all_projects: (args) => handlers.scan_projects(args),

  load_project_sessions: ({ projectPath }) => {
    if (!projectPath || !existsSync(projectPath)) return [];
    const cache = loadSessionCache(projectPath);
    const sessions = [];
    for (const f of readdirSync(projectPath).filter((f) => f.endsWith(".jsonl"))) {
      const filePath = join(projectPath, f);
      const sessionId = f.replace(".jsonl", "");
      const stat = statSync(filePath);
      let summary = null, msgCount = null, firstTime = null, lastTime = null;

      if (cache?.entries) {
        const entry = cache.entries[filePath];
        if (entry?.session) {
          summary = entry.session.summary || entry.first_user_content;
          msgCount = entry.session.message_count;
          firstTime = entry.session.first_message_time;
          lastTime = entry.session.last_message_time;
        }
      }
      if (!summary) summary = getSessionSummary(filePath);

      const cwd = getCwdFromFile(filePath);
      sessions.push({
        session_id: sessionId,
        actual_session_id: sessionId,
        project_name: cwd ? basename(cwd) : basename(projectPath),
        file_path: filePath,
        message_count: msgCount || 0,
        first_message_time: firstTime || new Date(stat.birthtimeMs).toISOString(),
        last_message_time: lastTime || new Date(stat.mtimeMs).toISOString(),
        last_modified: new Date(stat.mtimeMs).toISOString(),
        has_tool_use: false,
        has_errors: false,
        summary: summary || `Session ${sessionId.slice(0, 8)}...`,
        provider: "claude",
      });
    }
    sessions.sort((a, b) => new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime());
    return sessions;
  },

  load_provider_sessions: (args) => handlers.load_project_sessions(args),

  load_session_messages: ({ sessionPath }) => {
    if (!sessionPath || !existsSync(sessionPath)) return [];
    const messages = [];
    const content = readFileSync(sessionPath, "utf8");
    for (const line of content.split("\n")) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line);
        if (data.type === "file-history-snapshot" || data.type === "queue-operation") continue;

        // Normalize message content to top-level fields expected by frontend
        const msg = data.message || {};
        const entry = {
          uuid: data.uuid || crypto.randomUUID(),
          parentUuid: data.parentUuid || null,
          sessionId: data.sessionId || "",
          timestamp: data.timestamp || "",
          type: data.type || "user",
          isSidechain: data.isSidechain || false,
          cwd: data.cwd,
          version: data.version,
          message: msg,
          content: msg.content ?? data.content ?? "",
          model: msg.model,
          usage: msg.usage,
          toolUse: data.toolUse || null,
          toolUseResult: data.toolUseResult ?? null,
          costUSD: data.costUSD,
          durationMs: data.durationMs,
        };
        messages.push(entry);
      } catch {}
    }
    return messages;
  },

  load_provider_messages: (args) => handlers.load_session_messages(args),

  load_session_messages_paginated: ({ sessionPath }) => {
    const all = handlers.load_session_messages({ sessionPath });
    return {
      messages: all,
      total: all.length,
      page: 1,
      page_size: all.length,
      has_more: false,
    };
  },

  search_messages: ({ query, claudePath }) => {
    if (!query) return [];
    const results = [];
    const q = query.toLowerCase();
    const dir = claudePath ? join(claudePath, "projects") : PROJECTS_DIR;
    if (!existsSync(dir)) return [];
    for (const projectName of readdirSync(dir)) {
      const projectDir = join(dir, projectName);
      try { if (!statSync(projectDir).isDirectory()) continue; } catch { continue; }
      for (const f of readdirSync(projectDir).filter((f) => f.endsWith(".jsonl"))) {
        try {
          const content = readFileSync(join(projectDir, f), "utf8");
          if (!content.toLowerCase().includes(q)) continue;
          const sessionId = f.replace(".jsonl", "");
          const summary = getSessionSummary(join(projectDir, f));
          results.push({
            session_id: sessionId,
            project_name: projectName,
            file_path: join(projectDir, f),
            summary: summary || sessionId.slice(0, 8),
            match_count: 1,
          });
          if (results.length >= 50) break;
        } catch {}
      }
      if (results.length >= 50) break;
    }
    return results;
  },

  load_all_recent_sessions: () => {
    const dir = PROJECTS_DIR;
    if (!existsSync(dir)) return [];
    const allSessions = [];
    for (const name of readdirSync(dir)) {
      const projectDir = join(dir, name);
      try { if (!statSync(projectDir).isDirectory()) continue; } catch { continue; }
      const jsonlFiles = readdirSync(projectDir).filter((f) => f.endsWith(".jsonl"));
      if (jsonlFiles.length === 0) continue;
      const cache = loadSessionCache(projectDir);
      const realPath = getCwdFromFile(join(projectDir, jsonlFiles[0])) || decodeProjectPath(name);
      const projectName = basename(realPath);
      for (const f of jsonlFiles) {
        const filePath = join(projectDir, f);
        const sessionId = f.replace(".jsonl", "");
        let stat;
        try { stat = statSync(filePath); } catch { continue; }
        let summary = null, msgCount = null, firstTime = null, lastTime = null;
        if (cache?.entries) {
          const entry = cache.entries[filePath];
          if (entry?.session) {
            summary = entry.session.summary || entry.first_user_content;
            msgCount = entry.session.message_count;
            firstTime = entry.session.first_message_time;
            lastTime = entry.session.last_message_time;
          }
        }
        if (!summary) summary = getSessionSummary(filePath);
        allSessions.push({
          session_id: sessionId,
          actual_session_id: sessionId,
          project_name: projectName,
          file_path: filePath,
          message_count: msgCount || 0,
          first_message_time: firstTime || new Date(stat.birthtimeMs).toISOString(),
          last_message_time: lastTime || new Date(stat.mtimeMs).toISOString(),
          last_modified: new Date(stat.mtimeMs).toISOString(),
          has_tool_use: false,
          has_errors: false,
          summary: summary || `Session ${sessionId.slice(0, 8)}...`,
          provider: "claude",
        });
      }
    }
    allSessions.sort((a, b) => new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime());
    return allSessions.slice(0, 100);
  },

  load_recent_sessions: (args) => handlers.load_all_recent_sessions(args),

  // Stats (return zeros for now — optional feature)
  get_session_token_stats: () => ({ total_input_tokens: 0, total_output_tokens: 0, total_cache_creation: 0, total_cache_read: 0, message_count: 0, model_breakdown: {} }),
  get_project_token_stats: () => ({ sessions: [], total_sessions: 0, page: 1, page_size: 20 }),
  get_project_stats_summary: () => ({ total_sessions: 0, total_messages: 0, total_input_tokens: 0, total_output_tokens: 0, date_range: {} }),
  get_global_stats_summary: () => ({ total_projects: 0, total_sessions: 0, total_messages: 0 }),
  get_session_comparison: () => [],
  get_recent_edits: () => [],

  // Metadata / settings (no-ops)
  load_mcp_presets: () => [],
  load_presets: () => [],
  get_all_mcp_servers: () => [],
  load_metadata: () => ({}),
  save_metadata: () => ({}),
  load_user_metadata: () => ({ version: 1, sessions: {}, projects: {}, settings: {} }),
  save_user_metadata: () => ({}),
  load_settings: () => null,
  save_settings: () => ({}),
  get_all_settings: () => ({}),
  load_session_metadata: () => ({}),
  save_session_metadata: () => ({}),
  rename_session_native: () => ({}),
  read_text_file: () => "",
  write_text_file: () => ({}),
  get_git_log: () => [],
};

// ── MIME types for static file serving ──

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

// ── HTTP Server ──

const server = createServer((req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  // API routes
  if (req.url?.startsWith("/api/")) {
    const command = req.url.replace("/api/", "").split("?")[0];
    const handler = handlers[command];
    if (!handler) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: `Unknown: ${command}` }));
      return;
    }
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        const args = body ? JSON.parse(body) : {};
        const result = handler(args);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: String(err) }));
      }
    });
    return;
  }

  // SSE events endpoint (no-op stream)
  if (req.url === "/api/events") {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
    const interval = setInterval(() => res.write(": keepalive\n\n"), 30000);
    req.on("close", () => clearInterval(interval));
    return;
  }

  // Static file serving from dist/
  let filePath = join(DIST_DIR, req.url === "/" ? "index.html" : req.url.split("?")[0]);
  if (!existsSync(filePath)) filePath = join(DIST_DIR, "index.html"); // SPA fallback
  try {
    const ext = extname(filePath);
    const contentType = MIME[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(PORT, HOST, () => {
  console.log();
  console.log("  \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557");
  console.log("  \u2551       T E M P E S T                 \u2551");
  console.log("  \u2551   Claude Code History Viewer        \u2551");
  console.log("  \u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d");
  console.log();
  console.log(`  \u2192 Local:  http://localhost:${PORT}`);
  console.log(`  \u2192 Remote: http://${HOST}:${PORT}`);
  console.log();
  console.log(`  SSH tunnel: ssh -L ${PORT}:localhost:${PORT} <host>`);
  console.log();
});
