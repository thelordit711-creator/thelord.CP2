import path from 'path';
import fs from 'fs';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '../utils/logger';

export type FileCategory = 'receipts' | 'avatars' | 'tasks' | 'chat' | 'general';

const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.dll', '.bat', '.cmd', '.sh', '.bash', '.php', '.phtml',
  '.pl', '.py', '.js', '.cjs', '.mjs', '.vbs', '.scr', '.jar',
  '.html', '.htm', '.xhtml', '.svg', '.jsp', '.asp', '.aspx', '.cgi'
]);

// Magic bytes signatures
const MAGIC_SIGNATURES: { mime: string; bytes: number[]; offset?: number }[] = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { mime: 'application/zip', bytes: [0x50, 0x4b, 0x03, 0x04] }, // PK..
  { mime: 'audio/mpeg', bytes: [0x49, 0x44, 0x33] }, // ID3
  { mime: 'audio/ogg', bytes: [0x4f, 0x67, 0x67, 0x53] }, // OggS
  { mime: 'video/mp4', bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 } // ....ftyp
];

export class StorageService {
  private static s3Client: S3Client | null = null;
  private static getBucketName(): string {
    return process.env.STORAGE_BUCKET || process.env.S3_BUCKET_NAME || '';
  }

  private static getS3Client(): S3Client | null {
    if (this.s3Client) return this.s3Client;

    const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY;
    const endpoint = process.env.STORAGE_ENDPOINT || process.env.S3_ENDPOINT; // Cloudflare R2 / custom S3 endpoint
    const region = process.env.STORAGE_REGION || process.env.S3_REGION || 'auto';
    const bucket = this.getBucketName();

    if (accessKeyId && secretAccessKey && bucket) {
      this.s3Client = new S3Client({
        region,
        endpoint: endpoint || undefined,
        credentials: {
          accessKeyId,
          secretAccessKey
        },
        forcePathStyle: !!endpoint // Required for R2 and MinIO
      });
      logger.info('☁️ [StorageService] Cloud Storage (S3/R2) initialized successfully');
      return this.s3Client;
    }

    return null;
  }

  /**
   * Validates file security: rejects dangerous extensions and checks Magic Bytes
   */
  public static validateFile(filename: string, buffer: Buffer, declaredMimeType: string): { isValid: boolean; error?: string } {
    const ext = path.extname(filename).toLowerCase();

    // 1. Check dangerous extension
    if (DANGEROUS_EXTENSIONS.has(ext)) {
      logger.security(`Blocked upload attempt with dangerous file extension: ${filename}`);
      return {
        isValid: false,
        error: `نوع الملف (${ext}) محظور تماماً لدواعي الأمان والحماية البرمجية.`
      };
    }

    // 2. Prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return {
        isValid: false,
        error: 'اسم الملف يحتوي على رموز مسار غير مسموح بها.'
      };
    }

    // 3. Inspect Magic Bytes if buffer available
    if (buffer && buffer.length >= 8) {
      const matched = MAGIC_SIGNATURES.find(sig => {
        const offset = sig.offset || 0;
        if (buffer.length < offset + sig.bytes.length) return false;
        return sig.bytes.every((byte, idx) => buffer[offset + idx] === byte);
      });

      // If declared to be an image or pdf but magic bytes mismatch
      if (declaredMimeType.startsWith('image/') || declaredMimeType === 'application/pdf') {
        if (!matched) {
          logger.security(`Mime-type spoofing detected for file ${filename}: declared ${declaredMimeType} but magic bytes did not match.`);
          return {
            isValid: false,
            error: 'فشل التحقق من صحة الملف: محتوى الملف الحقيقي لا يطابق الامتداد المصرح به.'
          };
        }
      }
    }

    return { isValid: true };
  }

  /**
   * Upload file to Cloud S3/R2 or fallback to safe local storage
   */
  public static async uploadFile(params: {
    category: FileCategory;
    originalName: string;
    buffer: Buffer;
    mimeType: string;
    isPrivate?: boolean;
  }): Promise<{ fileUrl: string; key: string; isCloud: boolean }> {
    const s3 = this.getS3Client();
    const sanitizedBase = path.basename(params.originalName)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.[^/.]+$/, '');
    const ext = path.extname(params.originalName).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const key = `${params.category}/${uniqueSuffix}_${sanitizedBase}${ext}`;

    // 1. Upload to Cloud S3 / Cloudflare R2 if configured
    const bucket = this.getBucketName();
    if (s3 && bucket) {
      try {
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: params.buffer,
            ContentType: params.mimeType,
            CacheControl: 'max-age=31536000'
          })
        );

        const publicDomain = process.env.STORAGE_PUBLIC_URL || process.env.S3_PUBLIC_DOMAIN;
        const fileUrl = publicDomain
          ? `${publicDomain.replace(/\/$/, '')}/${key}`
          : `https://${bucket}.s3.amazonaws.com/${key}`;

        return { fileUrl, key, isCloud: true };
      } catch (err) {
        logger.error('Failed to upload file to Cloud S3/R2, falling back to local storage', err);
      }
    }

    // 2. Safe Fallback to Local Storage
    const isServerless = !!process.env.VERCEL;
    const baseDir = isServerless ? path.join('/tmp', 'uploads') : path.join(process.cwd(), 'uploads');
    const categoryDir = path.join(baseDir, params.category);

    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true });
    }

    const localFilename = `${uniqueSuffix}_${sanitizedBase}${ext}`;
    const localFilePath = path.join(categoryDir, localFilename);
    fs.writeFileSync(localFilePath, params.buffer);

    const fileUrl = `/uploads/${params.category}/${localFilename}`;
    return { fileUrl, key: localFilename, isCloud: false };
  }

  /**
   * Generate Temporary Presigned URL for private financial documents/receipts
   */
  public static async getPresignedUrl(key: string, expiresInSeconds: number = 3600): Promise<string> {
    const s3 = this.getS3Client();
    const bucket = this.getBucketName();
    if (s3 && bucket) {
      try {
        const command = new GetObjectCommand({
          Bucket: bucket,
          Key: key
        });
        return await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
      } catch (err) {
        logger.error('Failed to generate presigned download URL', err);
      }
    }
    return `/uploads/${key}`;
  }
}
