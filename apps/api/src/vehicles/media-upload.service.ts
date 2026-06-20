import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface PresignResult {
  uploadUrl: string; // PUT the file bytes here
  publicUrl: string; // attach this to the vehicle once uploaded
  key: string;
}

/**
 * Presigned S3 uploads (key-ready). Active only when S3_BUCKET + region + creds
 * are set; otherwise callers fall back to URL-attach. See issue #29 / plan 02.
 */
@Injectable()
export class MediaUploadService {
  private readonly bucket = process.env.S3_BUCKET ?? '';
  private readonly region = process.env.S3_REGION ?? 'ap-south-1';
  private readonly publicBase = (process.env.S3_PUBLIC_BASE ?? '').replace(/\/$/, '');

  get isConfigured(): boolean {
    return !!this.bucket && !!process.env.S3_ACCESS_KEY_ID && !!process.env.S3_SECRET_ACCESS_KEY;
  }

  private client(): S3Client {
    return new S3Client({
      region: this.region,
      ...(process.env.S3_ENDPOINT
        ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true }
        : {}),
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
      },
    });
  }

  async presign(vehicleId: string, contentType: string): Promise<PresignResult> {
    if (!this.isConfigured) {
      throw new BadRequestException('S3 not configured — attach a photo URL instead');
    }
    const ext = contentType.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'jpg';
    const key = `vehicles/${vehicleId}/${randomUUID()}.${ext}`;
    const uploadUrl = await getSignedUrl(
      this.client(),
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
      { expiresIn: 300 },
    );
    const publicUrl = this.publicBase
      ? `${this.publicBase}/${key}`
      : `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    return { uploadUrl, publicUrl, key };
  }
}
