import formidable from 'formidable';
import fs from 'fs/promises';
import crypto from 'crypto';
import sharp from 'sharp';
import { isAuthenticated } from '../../../../../lib/auth';
import { getAlbumById } from '../../../../../lib/albums';
import { uploadVariant, addPhotoToManifest, listPhotos } from '../../../../../lib/blob';
import { looksLikeHeic, convertHeicToJpegBuffer } from '../../../../../lib/heic';

export const config = {
  api: {
    bodyParser: false,
  },
};

function generateId() {
  return crypto.randomBytes(6).toString('hex');
}

async function normalizeToStandardImage(buffer, filename) {
  // iPhones often export HEIC/HEIF, which sharp's default build can't
  // reliably decode. Convert to JPEG first so the rest of the pipeline
  // (resize, WebP, etc.) works the same for every source format.
  if (looksLikeHeic(buffer, filename)) {
    return convertHeicToJpegBuffer(buffer);
  }
  return buffer;
}

async function processAndUpload(albumId, id, buffer, originalFilename) {
  const normalized = await normalizeToStandardImage(buffer, originalFilename);
  const base = sharp(normalized).rotate(); // auto-orient using EXIF, then strip it

  const thumb = base.clone().resize({ width: 500, height: 500, fit: 'inside', withoutEnlargement: true });
  const full = base.clone().resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true });

  const [thumbWebp, thumbJpg, fullWebp, fullJpg] = await Promise.all([
    thumb.clone().webp({ quality: 72 }).toBuffer(),
    thumb.clone().jpeg({ quality: 72, mozjpeg: true }).toBuffer(),
    full.clone().webp({ quality: 80 }).toBuffer(),
    full.clone().jpeg({ quality: 80, mozjpeg: true }).toBuffer(),
  ]);

  const [thumbWebpUrl, thumbJpgUrl, fullWebpUrl, fullJpgUrl] = await Promise.all([
    uploadVariant(albumId, id, 'thumb-webp', thumbWebp, 'image/webp'),
    uploadVariant(albumId, id, 'thumb-jpg', thumbJpg, 'image/jpeg'),
    uploadVariant(albumId, id, 'full-webp', fullWebp, 'image/webp'),
    uploadVariant(albumId, id, 'full-jpg', fullJpg, 'image/jpeg'),
  ]);

  const photo = {
    id,
    caption: '',
    uploadedAt: new Date().toISOString(),
    thumbWebp: thumbWebpUrl,
    thumbJpg: thumbJpgUrl,
    fullWebp: fullWebpUrl,
    fullJpg: fullJpgUrl,
  };

  await addPhotoToManifest(albumId, photo);
  return photo;
}

export default async function handler(req, res) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id: albumId } = req.query;
  const album = await getAlbumById(albumId);
  if (!album) return res.status(404).json({ error: 'Album not found' });

  if (req.method === 'GET') {
    try {
      const photos = await listPhotos(albumId);
      res.setHeader('Cache-Control', 'no-store, must-revalidate');
      return res.status(200).json({ photos });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to list photos' });
    }
  }

  if (req.method === 'POST') {
    const form = formidable({
      multiples: true,
      maxFileSize: 4.4 * 1024 * 1024, // Vercel serverless functions cap request bodies at ~4.5MB
    });

    let files;
    try {
      [, files] = await form.parse(req);
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
        const photo = await processAndUpload(albumId, id, buffer, file.originalFilename);
        results.push({ id: photo.id, ok: true });
      } catch (err) {
        console.error('Upload failed for a file:', err);
        results.push({ ok: false, error: 'Processing failed' });
      } finally {
        fs.unlink(file.filepath).catch(() => {});
      }
    }

    const anyFailed = results.some((r) => !r.ok);
    return res.status(anyFailed ? 207 : 200).json({ results });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}
