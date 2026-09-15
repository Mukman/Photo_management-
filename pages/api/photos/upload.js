import formidable from 'formidable';
import fs from 'fs/promises';
import crypto from 'crypto';
import sharp from 'sharp';
import { isAuthenticated } from '../../../lib/auth';
import { uploadVariant } from '../../../lib/blob';

export const config = {
  api: {
    bodyParser: false,
  },
};

function generateId() {
  return crypto.randomBytes(6).toString('hex');
}

async function processAndUpload(id, buffer) {
  const base = sharp(buffer).rotate(); // auto-orient using EXIF, then strip it

  const thumb = base.clone().resize({ width: 500, height: 500, fit: 'inside', withoutEnlargement: true });
  const full = base.clone().resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true });

  const [thumbWebp, thumbJpg, fullWebp, fullJpg] = await Promise.all([
    thumb.clone().webp({ quality: 72 }).toBuffer(),
    thumb.clone().jpeg({ quality: 72, mozjpeg: true }).toBuffer(),
    full.clone().webp({ quality: 80 }).toBuffer(),
    full.clone().jpeg({ quality: 80, mozjpeg: true }).toBuffer(),
  ]);

  await Promise.all([
    uploadVariant(id, 'thumb-webp', thumbWebp, 'image/webp'),
    uploadVariant(id, 'thumb-jpg', thumbJpg, 'image/jpeg'),
    uploadVariant(id, 'full-webp', fullWebp, 'image/webp'),
    uploadVariant(id, 'full-jpg', fullJpg, 'image/jpeg'),
  ]);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const form = formidable({
    multiples: true,
    maxFileSize: 25 * 1024 * 1024, // 25MB per file
  });

  let fields, files;
  try {
    [fields, files] = await form.parse(req);
  } catch (err) {
    console.error(err);
    return res.status(400).json({ error: 'Failed to parse upload' });
  }

  const uploaded = files.photos
    ? Array.isArray(files.photos) ? files.photos : [files.photos]
    : [];

  if (uploaded.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const results = [];
  for (const file of uploaded) {
    try {
      const buffer = await fs.readFile(file.filepath);
      const id = generateId();
      await processAndUpload(id, buffer);
      results.push({ id, ok: true });
    } catch (err) {
      console.error('Upload failed for a file:', err);
      results.push({ ok: false, error: 'Processing failed' });
    } finally {
      // Clean up the temp file formidable created
      fs.unlink(file.filepath).catch(() => {});
    }
  }

  const anyFailed = results.some((r) => !r.ok);
  return res.status(anyFailed ? 207 : 200).json({ results });
}
