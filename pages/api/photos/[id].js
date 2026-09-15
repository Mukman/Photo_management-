import { isAuthenticated } from '../../../lib/auth';
import { deletePhoto } from '../../../lib/blob';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string' || !/^[a-f0-9]+$/.test(id)) {
    return res.status(400).json({ error: 'Invalid photo id' });
  }

  try {
    await deletePhoto(id);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete photo' });
  }
}
