import { describe, it, expect, vi, afterEach } from 'vitest';
import { EmailService } from './email.service';

describe('EmailService', () => {
  afterEach(() => {
    delete process.env.EMAIL_PROVIDER;
    delete process.env.RESEND_API_KEY;
    vi.restoreAllMocks();
  });

  it('mock mode does not call out', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await new EmailService().sendOtp('a@b.com', '1234');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('resend mode posts to the Resend API with the code', async () => {
    process.env.EMAIL_PROVIDER = 'resend';
    process.env.RESEND_API_KEY = 'k';
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, text: async () => '' });
    vi.stubGlobal('fetch', fetchSpy);
    await new EmailService().sendOtp('a@b.com', '4321');
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(JSON.parse(opts.body).text).toContain('4321');
  });

  it('resend without a key throws', async () => {
    process.env.EMAIL_PROVIDER = 'resend';
    await expect(new EmailService().sendOtp('a@b.com', '1')).rejects.toThrow(/RESEND_API_KEY/);
  });
});
