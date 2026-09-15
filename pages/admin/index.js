import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        router.push('/admin/dashboard');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head><title>Admin Login</title></Head>
      <div style={styles.page}>
        <form onSubmit={handleSubmit} style={styles.card}>
          <h1 style={styles.h1}>Admin Login</h1>
          <label style={styles.label}>
            Username
            <input
              style={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label style={styles.label}>
            Password
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    background: '#1a1918',
    border: '1px solid #2c2a27',
    borderRadius: 12,
    padding: 32,
    width: '100%',
    maxWidth: 360,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  h1: { margin: '0 0 8px', fontSize: 22, fontWeight: 600 },
  label: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, color: '#9a938a' },
  input: {
    background: '#121110',
    border: '1px solid #2c2a27',
    borderRadius: 8,
    padding: '10px 12px',
    color: '#ece7e0',
    fontSize: 15,
  },
  error: { color: '#c25b4d', fontSize: 14, margin: 0 },
  button: {
    marginTop: 8,
    background: '#c9a15a',
    color: '#121110',
    border: 'none',
    borderRadius: 8,
    padding: '12px 16px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
};
