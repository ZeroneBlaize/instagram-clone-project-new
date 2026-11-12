import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';

const ALLOWED_MIME_EXTENSIONS = new Map<string, string>([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB strict cap

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_EXTENSIONS.has(file.mimetype)) {
      cb(new Error('GUARDRAIL_INVALID_MEDIA: Only JPEG, PNG, and WebP images are permitted.'));
      return;
    }
    cb(null, true);
  },
});

/**
 * Verify binary file header magic bytes so spoofed HTML/SVG/JS scripts cannot bypass MIME checks.
 */
export function detectImageExtensionFromMagicBytes(buf: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (buf.length < 12) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'jpg';
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'png';
  }
  // WebP: RIFF....WEBP
  if (
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }

  return null;
}

export function saveValidatedUpload(file: Express.Multer.File, uploadDir: string): string {
  const detectedExt = detectImageExtensionFromMagicBytes(file.buffer);
  const expectedExt = ALLOWED_MIME_EXTENSIONS.get(file.mimetype);

  if (!detectedExt || !expectedExt || detectedExt !== expectedExt) {
    throw new Error('GUARDRAIL_INVALID_MEDIA: File content signature does not match declared image type.');
  }

  fs.mkdirSync(uploadDir, { recursive: true });
  const safeName = `${crypto.randomUUID()}.${detectedExt}`;
  const targetPath = path.join(uploadDir, safeName);
  fs.writeFileSync(targetPath, file.buffer);
  return `/uploads/${safeName}`;
}
