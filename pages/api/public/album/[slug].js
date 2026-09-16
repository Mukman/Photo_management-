import { getAlbumBySlug } from '../../../../lib/albums';
import { listPhotos } from '../../../../lib/blob';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { slug } = req.query;
  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'Invalid album' });
  }

  try {
    const album = await getAlbumBySlug(slug);
    if (!album) return res.status(404).json({ error: 'Album not found' });

    const photos = await listPhotos(album.id);
    // Only expose what the public gallery needs — no internal ids beyond photo id.
    const publicPhotos = photos.map((p) => ({
      id: p.id,
      caption: p.caption || '',
      thumbWebp: p.thumbWebp,
      thumbJpg: p.thumbJpg,
      fullWebp: p.fullWebp,
      fullJpg: p.fullJpg,
    }));

    res.setHeader('Cache-Control', 'no-store, must-revalidate');
    return res.status(200).json({ title: album.title, photos: publicPhotos });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load album' });
  }
}
