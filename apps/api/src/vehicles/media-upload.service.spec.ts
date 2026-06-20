import { describe, it, expect, afterEach } from 'vitest';
import { MediaUploadService } from './media-upload.service';

describe('MediaUploadService', () => {
  afterEach(() => {
    delete process.env.S3_BUCKET;
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.S3_SECRET_ACCESS_KEY;
  });

  it('not configured without creds; presign rejects', async () => {
    const s = new MediaUploadService();
    expect(s.isConfigured).toBe(false);
    await expect(s.presign('v1', 'image/jpeg')).rejects.toThrow(/S3 not configured/);
  });

  it('configured when bucket + creds set; presigns a PUT URL', async () => {
    process.env.S3_BUCKET = 'mana-media';
    process.env.S3_ACCESS_KEY_ID = 'AKIA';
    process.env.S3_SECRET_ACCESS_KEY = 'secret';
    const s = new MediaUploadService();
    expect(s.isConfigured).toBe(true);
    const r = await s.presign('veh1', 'image/jpeg');
    expect(r.key).toMatch(/^vehicles\/veh1\/.+\.jpeg$/);
    expect(r.uploadUrl).toContain('X-Amz-Signature');
    expect(r.publicUrl).toContain('mana-media');
  });
});
