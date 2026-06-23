import { loadConfig } from './config';
import { Telegram, stripMention, type TgMessage } from './telegram';
import { AgentRunner } from './runner';

async function main() {
  const cfg = loadConfig();
  const tg = new Telegram(cfg.botToken);
  const runner = new AgentRunner(cfg);

  const me = await tg.getMe();
  const username = me.username ?? 'mana_dev';
  console.log(
    `mana-dev online as @${username} · repo ${cfg.repoDir} · chats ${[...cfg.allowedChatIds].join(', ')}`,
  );

  const allowed = (m: TgMessage): boolean => {
    if (!cfg.allowedChatIds.has(m.chat.id)) return false;
    if (cfg.allowedUserIds.size > 0 && (!m.from || !cfg.allowedUserIds.has(m.from.id)))
      return false;
    return true;
  };

  let offset = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const updates = await tg.getUpdates(offset);
    for (const u of updates) {
      offset = u.update_id + 1;
      const m = u.message;
      if (!m || !m.text || m.from?.is_bot) continue;
      if (!allowed(m)) continue;

      const text = stripMention(m.text, username);

      // Slash commands.
      if (/^\/reset\b/.test(text)) {
        runner.reset(m.chat.id);
        await tg.send(
          m.chat.id,
          'Context cleared — next message starts a fresh session.',
          m.message_id,
        );
        continue;
      }
      if (/^\/help\b/.test(text) || /^\/start\b/.test(text)) {
        await tg.send(
          m.chat.id,
          `I'm mana-dev. Mention me with a request and I'll work on the repo and reply here.\n\n• @${username} <instruction> — do the work\n• /reset — start a fresh session\n\nI have full autonomy: I can open PRs, merge, and deploy.`,
          m.message_id,
        );
        continue;
      }
      if (!text) continue;

      await tg.send(m.chat.id, '🛠️ On it…', m.message_id);
      const heartbeat = setInterval(() => void tg.typing(m.chat.id), 6000);
      void tg.typing(m.chat.id);
      try {
        const res = await runner.run(m.chat.id, text);
        clearInterval(heartbeat);
        await tg.send(m.chat.id, res.text || 'Done.', m.message_id);
      } catch (err) {
        clearInterval(heartbeat);
        await tg.send(m.chat.id, `Failed: ${String(err)}`, m.message_id);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
