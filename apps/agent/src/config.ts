import { resolve } from 'node:path';

export interface Config {
  botToken: string;
  /** Telegram chat ids the bot will respond in (the founder group). */
  allowedChatIds: Set<number>;
  /** Optional: restrict which Telegram user ids may instruct the bot. Empty = anyone in an allowed chat. */
  allowedUserIds: Set<number>;
  /** Repo the agent operates on. */
  repoDir: string;
  /** Path to the Claude Code CLI binary. */
  claudeBin: string;
  /** Extra args appended to every `claude -p` invocation. */
  extraArgs: string[];
  /** Hard timeout for a single agent run. */
  runTimeoutMs: number;
}

function ids(raw: string | undefined): Set<number> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n !== 0),
  );
}

export function loadConfig(): Config {
  const botToken = process.env.TELEGRAM_BOT_TOKEN ?? '';
  if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN is required');

  const allowedChatIds = ids(process.env.AGENT_ALLOWED_CHAT_IDS);
  if (allowedChatIds.size === 0) {
    throw new Error('AGENT_ALLOWED_CHAT_IDS is required (comma-separated Telegram chat ids)');
  }

  return {
    botToken,
    allowedChatIds,
    allowedUserIds: ids(process.env.AGENT_ALLOWED_USER_IDS),
    // Default to the monorepo root (two levels up from apps/agent/src).
    repoDir: resolve(process.env.AGENT_REPO_DIR ?? resolve(__dirname, '../../..')),
    claudeBin: process.env.AGENT_CLAUDE_BIN ?? 'claude',
    extraArgs: (process.env.AGENT_CLAUDE_ARGS ?? '').split(' ').filter(Boolean),
    runTimeoutMs: Number(process.env.AGENT_RUN_TIMEOUT_MS ?? 30 * 60 * 1000),
  };
}
