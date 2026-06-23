# mana-dev — Telegram dev agent

A Telegram **group bot** that runs Claude Code against this repo when you address it.
Mention `@mana-dev` (or whatever you name the bot) in the founder group with a request;
it works on the repo and replies in the thread. It has **full autonomy** — it can open
PRs, merge, and deploy.

```
Founder group → @mana-dev <request>
  → this service (long-polls Telegram)
  → runs `claude -p <request>` in the repo (full tools: bash, edit, git, gh)
  → posts the result back in the group
```

Why Telegram (not WhatsApp): WhatsApp's official API has **no group support**, and group
bots there need an unofficial, ToS-violating bridge. Telegram supports group bots + `@mention`
triggers officially, with zero ban risk.

## 1. Create the bot

1. In Telegram, message **@BotFather** → `/newbot` → pick a name and username (e.g. `mana_dev_bot`).
   Copy the **token**.
2. Add the bot to your founder group.
3. **Privacy mode** (default **ON**) is what you want: the bot only receives messages that
   @mention it, reply to it, or are commands. Leave it on.

## 2. Find the group chat id

Add the bot to the group, send a message that mentions it, then:

```bash
curl "https://api.telegram.org/bot<TOKEN>/getUpdates"
```

Look for `message.chat.id` (group ids are negative, e.g. `-1001234567890`).

## 3. Configure

Set these env vars (see root `.env.example`):

| Var | Required | Notes |
|-----|----------|-------|
| `TELEGRAM_BOT_TOKEN` | yes | from BotFather |
| `AGENT_ALLOWED_CHAT_IDS` | yes | comma-separated group ids the bot answers in |
| `AGENT_ALLOWED_USER_IDS` | no | restrict who may instruct it (empty = anyone in the group) |
| `AGENT_REPO_DIR` | no | repo to operate on (default: this monorepo root) |
| `AGENT_CLAUDE_BIN` | no | path to the `claude` CLI (default `claude`) |
| `AGENT_CLAUDE_ARGS` | no | extra args appended to every run (e.g. `--model claude-opus-4-8`) |
| `AGENT_RUN_TIMEOUT_MS` | no | per-request timeout (default 30 min) |

## 4. Host requirements

The host running this service must have:

- The **Claude Code CLI** installed and authenticated (`claude` on PATH; `ANTHROPIC_API_KEY`
  or a logged-in session).
- `git` and `gh` configured with push/PR rights to the repo (so it can branch, PR, merge).
- A checkout of this repo at `AGENT_REPO_DIR`.

Because runs use `--dangerously-skip-permissions` (no TTY to approve tools) and the bot can
merge + deploy, **run it on a trusted host** and keep `AGENT_ALLOWED_CHAT_IDS` tight.

## 5. Run

```bash
pnpm --filter @mana/agent start
```

In the group:

- `@mana-dev add a /healthz route to the API` → it works and replies.
- `/reset` → start a fresh session (clears conversation context for that chat).
- `/help` → usage.

Runs are **serialized** (one at a time) because they share one working tree. Each chat keeps
its own Claude session, so follow-up messages have context until you `/reset`.
