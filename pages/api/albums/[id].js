import { isAuthenticated } from '../../../lib/auth';
import { deleteAlbumRecord, getAlbumById } from '../../../lib/albums';
import { deleteAllAlbumPhotos } from '../../../lib/blob';

export default async function handler(req, res) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid album id' });
  }

  try {
    const album = await getAlbumById(id);
    if (!album) return res.status(404).json({ error: 'Album not found' });

    await deleteAllAlbumPhotos(id);
    await deleteAlbumRecord(id);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete album' });
  }
}
