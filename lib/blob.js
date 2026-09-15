import { put, list, del } from '@vercel/blob';

const PREFIX = 'photos/';

// Builds the deterministic path for a given photo id + variant.
// variant: 'thumb-webp' | 'thumb-jpg' | 'full-webp' | 'full-jpg'
export function variantPath(id, variant) {
  const map = {
    'thumb-webp': `${PREFIX}${id}-thumb.webp`,
    'thumb-jpg': `${PREFIX}${id}-thumb.jpg`,
    'full-webp': `${PREFIX}${id}-full.webp`,
    'full-jpg': `${PREFIX}${id}-full.jpg`,
  };
  return map[variant];
}

export async function uploadVariant(id, variant, buffer, contentType) {
  const pathname = variantPath(id, variant);
  const blob = await put(pathname, buffer, {
    access: 'public',
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return blob.url;
}

// Lists all photos by grouping blob entries by their id prefix.
export async function listPhotos() {
  const { blobs } = await list({ prefix: PREFIX });

  const byId = new Map();

  for (const blob of blobs) {
    const filename = blob.pathname.substring(PREFIX.length); // e.g. "abc123-thumb.webp"
    const match = filename.match(/^(.+)-(thumb|full)\.(webp|jpg)$/);
    if (!match) continue;
    const [, id, size, ext] = match;

    if (!byId.has(id)) {
      byId.set(id, { id, uploadedAt: blob.uploadedAt });
    }
    const entry = byId.get(id);
    entry[`${size}${ext === 'webp' ? 'Webp' : 'Jpg'}`] = blob.url;
    // Track the earliest uploadedAt among the 4 variants for sort stability
    if (new Date(blob.uploadedAt) < new Date(entry.uploadedAt)) {
      entry.uploadedAt = blob.uploadedAt;
    }
  }

  return Array.from(byId.values())
    .filter((p) => p.thumbWebp && p.thumbJpg && p.fullWebp && p.fullJpg)
    .sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt));
}

export async function deletePhoto(id) {
  const urls = [
    variantPath(id, 'thumb-webp'),
    variantPath(id, 'thumb-jpg'),
    variantPath(id, 'full-webp'),
    variantPath(id, 'full-jpg'),
  ];
  // @vercel/blob del() accepts pathnames or full URLs; pathnames work directly.
  await del(urls);
}
