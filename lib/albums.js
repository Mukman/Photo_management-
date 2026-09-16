import { put, head } from '@vercel/blob';
import { randomUUID } from 'crypto';

const ALBUMS_INDEX_PATH = 'albums/index.json';

async function readAlbumsIndex() {
  try {
    const info = await head(ALBUMS_INDEX_PATH);
    const res = await fetch(info.url, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    // No index yet — first run.
    return [];
  }
}

async function writeAlbumsIndex(albums) {
  await put(ALBUMS_INDEX_PATH, JSON.stringify(albums, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

function slugify(title) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return base || 'album';
}

export async function listAlbums() {
  const albums = await readAlbumsIndex();
  return albums.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getAlbumById(id) {
  const albums = await readAlbumsIndex();
  return albums.find((a) => a.id === id) || null;
}

export async function getAlbumBySlug(slug) {
  const albums = await readAlbumsIndex();
  return albums.find((a) => a.slug === slug) || null;
}

export async function createAlbum(title) {
  const trimmed = (title || '').trim();
  if (!trimmed) throw new Error('Album title is required');

  const albums = await readAlbumsIndex();
  const baseSlug = slugify(trimmed);
  let slug = baseSlug;
  let n = 2;
  while (albums.some((a) => a.slug === slug)) {
    slug = `${baseSlug}-${n}`;
    n += 1;
  }

  const album = {
    id: randomUUID(),
    title: trimmed,
    slug,
    createdAt: new Date().toISOString(),
  };

  albums.push(album);
  await writeAlbumsIndex(albums);
  return album;
}

export async function deleteAlbumRecord(id) {
  const albums = await readAlbumsIndex();
  const filtered = albums.filter((a) => a.id !== id);
  await writeAlbumsIndex(filtered);
}
