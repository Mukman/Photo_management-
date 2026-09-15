import { buildClearCookie } from '../../../lib/auth';

export default function handler(req, res) {
  res.setHeader('Set-Cookie', buildClearCookie());
  return res.status(200).json({ ok: true });
}
