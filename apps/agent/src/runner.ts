import { spawn } from 'node:child_process';
import type { Config } from './config';

export interface RunResult {
  text: string;
  sessionId: string | null;
  isError: boolean;
}

/**
 * Runs the Claude Code CLI in print mode against the repo. Runs are serialized
 * with a global queue because they share one working tree — two concurrent
 * agents would clobber each other's edits / git state.
 */
export class AgentRunner {
  private chain: Promise<unknown> = Promise.resolve();
  /** Per-chat Claude session id, so a thread keeps context across messages. */
  private readonly sessions = new Map<number, string>();

  constructor(private readonly cfg: Config) {}

  run(chatId: number, instruction: string): Promise<RunResult> {
    const next = this.chain.then(() => this.exec(chatId, instruction));
    // Keep the chain alive even if this run rejects.
    this.chain = next.catch(() => undefined);
    return next;
  }

  private exec(chatId: number, instruction: string): Promise<RunResult> {
    const prior = this.sessions.get(chatId);
    const args = [
      '-p',
      instruction,
      '--output-format',
      'json',
      '--dangerously-skip-permissions',
      ...(prior ? ['--resume', prior] : []),
      ...this.cfg.extraArgs,
    ];

    return new Promise<RunResult>((resolvePromise) => {
      const child = spawn(this.cfg.claudeBin, args, {
        cwd: this.cfg.repoDir,
        env: process.env,
      });
      let stdout = '';
      let stderr = '';
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
      }, this.cfg.runTimeoutMs);

      child.stdout.on('data', (d) => (stdout += d.toString()));
      child.stderr.on('data', (d) => (stderr += d.toString()));

      child.on('error', (err) => {
        clearTimeout(timer);
        resolvePromise({
          text: `Could not launch the agent (${String(err)}). Is the \`claude\` CLI installed and on PATH?`,
          sessionId: null,
          isError: true,
        });
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        const parsed = parseResult(stdout);
        if (parsed) {
          if (parsed.sessionId) this.sessions.set(chatId, parsed.sessionId);
          resolvePromise(parsed);
          return;
        }
        resolvePromise({
          text:
            code === 0
              ? stdout.trim() || 'Done (no output).'
              : `Agent exited with code ${code}.\n${stderr.slice(-1500)}`,
          sessionId: null,
          isError: code !== 0,
        });
      });
    });
  }

  /** Drop a chat's session so the next message starts fresh. */
  reset(chatId: number): void {
    this.sessions.delete(chatId);
  }
}

function parseResult(stdout: string): RunResult | null {
  const trimmed = stdout.trim();
  if (!trimmed) return null;
  try {
    const obj = JSON.parse(trimmed) as {
      result?: string;
      session_id?: string;
      is_error?: boolean;
      subtype?: string;
    };
    if (typeof obj.result !== 'string' && !obj.session_id) return null;
    return {
      text: obj.result ?? `(${obj.subtype ?? 'no result'})`,
      sessionId: obj.session_id ?? null,
      isError: !!obj.is_error,
    };
  } catch {
    return null;
  }
}
