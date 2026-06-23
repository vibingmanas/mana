// Minimal Telegram Bot API client (long-polling, no deps).

export interface TgUser {
  id: number;
  is_bot: boolean;
  username?: string;
  first_name?: string;
}
export interface TgMessage {
  message_id: number;
  from?: TgUser;
  chat: { id: number; type: string; title?: string };
  text?: string;
  reply_to_message?: { from?: TgUser };
  entities?: { type: string; offset: number; length: number }[];
}
export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
}

export class Telegram {
  private readonly base: string;
  constructor(token: string) {
    this.base = `https://api.telegram.org/bot${token}`;
  }

  private async call<T>(method: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.base}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json()) as { ok: boolean; result?: T; description?: string };
    if (!data.ok) throw new Error(`Telegram ${method} failed: ${data.description}`);
    return data.result as T;
  }

  getMe() {
    return this.call<TgUser>('getMe');
  }

  /** Long-poll for updates. Returns [] on timeout. */
  async getUpdates(offset: number, timeoutSec = 50): Promise<TgUpdate[]> {
    try {
      return await this.call<TgUpdate[]>('getUpdates', {
        offset,
        timeout: timeoutSec,
        allowed_updates: ['message'],
      });
    } catch (err) {
      // Network blip — caller retries.
      console.warn(`getUpdates error: ${String(err)}`);
      return [];
    }
  }

  async send(chatId: number, text: string, replyTo?: number): Promise<void> {
    // Telegram caps messages at 4096 chars; chunk long replies.
    for (const chunk of chunkText(text, 3800)) {
      await this.call('sendMessage', {
        chat_id: chatId,
        text: chunk,
        reply_to_message_id: replyTo,
        disable_web_page_preview: true,
      }).catch((e) => console.warn(`sendMessage error: ${String(e)}`));
    }
  }

  typing(chatId: number): Promise<unknown> {
    return this.call('sendChatAction', { chat_id: chatId, action: 'typing' }).catch(() => null);
  }
}

export function chunkText(text: string, size: number): string[] {
  if (text.length <= size) return [text];
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}

/** Strip a leading @bot mention from the instruction text. */
export function stripMention(text: string, botUsername: string): string {
  return text.replace(new RegExp(`@${botUsername}\\b`, 'gi'), '').trim();
}
