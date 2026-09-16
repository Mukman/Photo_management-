import { isAuthenticated } from '../../../../../lib/auth';
import { updateCaption, deletePhoto } from '../../../../../lib/blob';

export default async function handler(req, res) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id: albumId, photoId } = req.query;
  if (!albumId || !photoId) {
    return res.status(400).json({ error: 'Missing album or photo id' });
  }

  if (req.method === 'PATCH') {
    try {
      const { caption } = req.body || {};
      const photo = await updateCaption(albumId, photoId, typeof caption === 'string' ? caption : '');
      return res.status(200).json({ photo });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update caption' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await deletePhoto(albumId, photoId);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to delete photo' });
    }
  }

  res.setHeader('Allow', ['PATCH', 'DELETE']);
  return res.status(405).json({ error: 'Method not allowed' });
}
