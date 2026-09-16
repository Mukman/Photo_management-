import { isAuthenticated } from '../../../lib/auth';
import { listAlbums, createAlbum } from '../../../lib/albums';

export default async function handler(req, res) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (req.method === 'GET') {
    try {
      const albums = await listAlbums();
      res.setHeader('Cache-Control', 'no-store, must-revalidate');
      return res.status(200).json({ albums });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to list albums' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { title } = req.body || {};
      const album = await createAlbum(title);
      return res.status(200).json({ album });
    } catch (err) {
      console.error(err);
      return res.status(400).json({ error: err.message || 'Failed to create album' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}
