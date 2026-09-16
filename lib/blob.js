import { put, del, head } from '@vercel/blob';

function manifestPath(albumId) {
  return `photos/${albumId}/manifest.json`;
}

function variantPath(albumId, photoId, variant) {
  const map = {
    'thumb-webp': `photos/${albumId}/${photoId}-thumb.webp`,
    'thumb-jpg': `photos/${albumId}/${photoId}-thumb.jpg`,
    'full-webp': `photos/${albumId}/${photoId}-full.webp`,
    'full-jpg': `photos/${albumId}/${photoId}-full.jpg`,
  };
  return map[variant];
}

async function readManifest(albumId) {
  try {
    const info = await head(manifestPath(albumId));
    const res = await fetch(info.url, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    return [];
  }
}

async function writeManifest(albumId, entries) {
  await put(manifestPath(albumId), JSON.stringify(entries, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function uploadVariant(albumId, photoId, variant, buffer, contentType) {
  const pathname = variantPath(albumId, photoId, variant);
  const blob = await put(pathname, buffer, {
    access: 'public',
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return blob.url;
}

export async function addPhotoToManifest(albumId, photo) {
  const entries = await readManifest(albumId);
  entries.push(photo);
  await writeManifest(albumId, entries);
}

export async function listPhotos(albumId) {
  const entries = await readManifest(albumId);
  return entries.slice().sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt));
}

export async function updateCaption(albumId, photoId, caption) {
  const entries = await readManifest(albumId);
  const idx = entries.findIndex((p) => p.id === photoId);
  if (idx === -1) throw new Error('Photo not found');
  entries[idx] = { ...entries[idx], caption };
  await writeManifest(albumId, entries);
  return entries[idx];
}

export async function deletePhoto(albumId, photoId) {
  const entries = await readManifest(albumId);
  const remaining = entries.filter((p) => p.id !== photoId);
  await writeManifest(albumId, remaining);

  const paths = [
    variantPath(albumId, photoId, 'thumb-webp'),
    variantPath(albumId, photoId, 'thumb-jpg'),
    variantPath(albumId, photoId, 'full-webp'),
    variantPath(albumId, photoId, 'full-jpg'),
  ];
  await del(paths);
}

export async function deleteAllAlbumPhotos(albumId) {
  const entries = await readManifest(albumId);
  const paths = [];
  for (const p of entries) {
    paths.push(
      variantPath(albumId, p.id, 'thumb-webp'),
      variantPath(albumId, p.id, 'thumb-jpg'),
      variantPath(albumId, p.id, 'full-webp'),
      variantPath(albumId, p.id, 'full-jpg')
    );
  }
  if (paths.length > 0) await del(paths);
  await del([manifestPath(albumId)]);
}
