import crypto from 'crypto';
import { createSessionToken, buildSessionCookie } from '../../../lib/auth';

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body || {};
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;

  if (!expectedUser || !expectedPass) {
    return res.status(500).json({ error: 'Admin credentials are not configured on the server' });
  }

  if (
    typeof username === 'string' &&
    typeof password === 'string' &&
    safeEqual(username, expectedUser) &&
    safeEqual(password, expectedPass)
  ) {
    const token = createSessionToken();
    res.setHeader('Set-Cookie', buildSessionCookie(token));
    return res.status(200).json({ ok: true });
  }

  return res.status(401).json({ error: 'Invalid username or password' });
}
