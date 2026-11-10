import { Router, Request, Response } from 'express';
import multer from 'multer';
import { verifyKindeJWT } from '../middlewares/verifyKindeJWT';
import { StorageService, FileCategory } from '../services/storage.service';
import { MediaFileType } from '@lord/shared-types';

const router = Router();
router.use(verifyKindeJWT);

// Store files in memory buffer for immediate security inspection before disk/cloud persistence
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB max limit
});

function detectFileType(mimetype: string): MediaFileType {
  if (mimetype.startsWith('image/')) return 'IMAGE';
  if (mimetype.includes('webm') || mimetype.includes('ogg') || mimetype.includes('audio/')) {
    return 'VOICE_NOTE';
  }
  if (mimetype.startsWith('video/')) return 'VIDEO';
  if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('tar')) {
    return 'ARCHIVE';
  }
  return 'DOCUMENT';
}

router.post('/', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'الملف مطلوب لعملية الرفع' });
      return;
    }

    const category = (req.body.category as FileCategory) || 'general';
    const originalName = req.file.originalname;
    const declaredMime = req.file.mimetype;

    // 1. Strict Security Validation: Anti-Exploit, Dangerous Extensions, & Magic Bytes
    const validation = StorageService.validateFile(originalName, req.file.buffer, declaredMime);
    if (!validation.isValid) {
      res.status(400).json({ success: false, error: validation.error });
      return;
    }

    // 2. Upload to S3/R2 Cloud or Safe Local Sandbox
    const uploadResult = await StorageService.uploadFile({
      category,
      originalName,
      buffer: req.file.buffer,
      mimeType: declaredMime,
      isPrivate: category === 'receipts'
    });

    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol;
    const resolvedUrl = uploadResult.fileUrl.startsWith('http')
      ? uploadResult.fileUrl
      : `${protocol}://${host}${uploadResult.fileUrl}`;

    const detectedType = detectFileType(declaredMime);

    res.json({
      success: true,
      data: {
        fileType: req.body.fileType || detectedType,
        fileName: originalName,
        fileUrl: resolvedUrl,
        storageKey: uploadResult.key,
        isCloudStorage: uploadResult.isCloud,
        mimeType: declaredMime,
        fileSizeInBytes: req.file.size,
        durationInSeconds: req.body.durationInSeconds ? parseFloat(req.body.durationInSeconds) : undefined,
        uploadedAt: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Presigned URL generation for sensitive private attachments (e.g. payout receipts)
router.get('/presigned-url', async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.query;
    if (!key || typeof key !== 'string') {
      res.status(400).json({ success: false, error: 'File key is required' });
      return;
    }

    const presignedUrl = await StorageService.getPresignedUrl(key);
    res.json({ success: true, presignedUrl });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
