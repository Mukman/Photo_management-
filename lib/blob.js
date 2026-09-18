import { put, del, list, head } from '@vercel/blob';

function metaPath(albumId, photoId) {
  return `photos/${albumId}/${photoId}.json`;
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

// Each photo gets its own metadata file (photos/{albumId}/{photoId}.json).
// This is what fixes the data-loss bug: uploading many photos in a row no
// longer means every upload reads-modifies-writes ONE shared list (where a
// slow write could clobber another upload's write and silently drop
// photos). Each upload only ever touches its own file, so uploads can never
// step on each other.
export async function addPhotoToManifest(albumId, photo) {
  await put(metaPath(albumId, photo.id), JSON.stringify(photo, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function listPhotos(albumId) {
  const { blobs } = await list({ prefix: `photos/${albumId}/` });
  const metaBlobs = blobs.filter((b) => {
    const filename = b.pathname.split('/').pop();
    // Matches "{photoId}.json" but not the *-thumb/-full image files.
    return /^[a-f0-9]+\.json$/.test(filename);
  });

  const photos = await Promise.all(
    metaBlobs.map(async (b) => {
      try {
        const res = await fetch(b.url, { cache: 'no-store' });
        if (!res.ok) return null;
        return await res.json();
      } catch (err) {
        return null;
      }
    })
  );

  return photos
    .filter(Boolean)
    .sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt));
}

export async function updateCaption(albumId, photoId, caption) {
  const path = metaPath(albumId, photoId);
  let existing;
  try {
    const info = await head(path);
    const res = await fetch(info.url, { cache: 'no-store' });
    existing = await res.json();
  } catch (err) {
    throw new Error('Photo not found');
  }

  const updated = { ...existing, caption };
  await put(path, JSON.stringify(updated, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return updated;
}

export async function deletePhoto(albumId, photoId) {
  const paths = [
    metaPath(albumId, photoId),
    variantPath(albumId, photoId, 'thumb-webp'),
    variantPath(albumId, photoId, 'thumb-jpg'),
    variantPath(albumId, photoId, 'full-webp'),
    variantPath(albumId, photoId, 'full-jpg'),
  ];
  await del(paths);
}

export async function deleteAllAlbumPhotos(albumId) {
  const { blobs } = await list({ prefix: `photos/${albumId}/` });
  const paths = blobs.map((b) => b.pathname);
  if (paths.length > 0) await del(paths);
}
