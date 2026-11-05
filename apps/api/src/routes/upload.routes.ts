import path from 'path';
import fs from 'fs';
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { verifyKindeJWT } from '../middlewares/verifyKindeJWT';
import { MediaFileType } from '@lord/shared-types';

const router = Router();
router.use(verifyKindeJWT);

// Ensure uploads directory exists safely across Vercel serverless and local node
const isServerless = !!process.env.VERCEL;
const uploadsDir = isServerless ? path.join('/tmp', 'uploads') : path.join(process.cwd(), 'uploads');

try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (err) {
  console.warn('Uploads directory creation warning:', err);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB max limit
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

router.post('/', upload.single('file'), (req: Request, res: Response): void => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }

    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol;
    const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    const detectedType = detectFileType(req.file.mimetype);

    res.json({
      success: true,
      data: {
        fileType: req.body.fileType || detectedType,
        fileName: req.file.originalname,
        fileUrl,
        mimeType: req.file.mimetype,
        fileSizeInBytes: req.file.size,
        durationInSeconds: req.body.durationInSeconds ? parseFloat(req.body.durationInSeconds) : undefined,
        uploadedAt: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;

