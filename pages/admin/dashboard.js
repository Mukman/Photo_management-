import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { isAuthenticated } from '../../lib/auth';

export async function getServerSideProps({ req }) {
  if (!isAuthenticated(req)) {
    return { redirect: { destination: '/admin', permanent: false } };
  }
  return { props: {} };
}

export default function Dashboard() {
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [origin, setOrigin] = useState('');
  const router = useRouter();

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function loadAlbums() {
    setLoading(true);
    const res = await fetch('/api/albums', { cache: 'no-store' });
    const data = await res.json();
    setAlbums(data.albums || []);
    setLoading(false);
  }

  useEffect(() => { loadAlbums(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    setMessage('');
    try {
      const res = await fetch('/api/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
         const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setNewTitle('');
        router.push(`/admin/album/${data.album.id}`);
      } else {
        setMessage(data.error || 'Failed to create album.');
      }
    } catch (err) {
      setMessage('Failed to create album.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id, title) {
    if (!confirm(`Delete "${title}" and all its photos? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/albums/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAlbums((prev) => prev.filter((a) => a.id !== id));
      } else {
        setMessage('Failed to delete album.');
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin');
  }

  function copyLink(slug) {
    const url = `${origin}/album/${slug}`;
    navigator.clipboard?.writeText(url);
    setMessage('Link copied.');
    setTimeout(() => setMessage(''), 2000);
  }

  return (
    <>
      <Head><title>Admin Dashboard</title></Head>
      <div style={styles.page}>
        <div style={styles.topbar}>
          <h1 style={styles.h1}>Albums</h1>
          <button onClick={handleLogout} style={styles.logoutBtn}>Log out</button>
        </div>

        <form onSubmit={handleCreate} style={styles.createBox}>
          <input
            style={styles.input}
            placeholder="New album name (e.g. Addis Trip 2026)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            disabled={creating}
          />
          <button type="submit" style={styles.createBtn} disabled={creating || !newTitle.trim()}>
            {creating ? 'Creating…' : '+ Create album'}
          </button>
        </form>
        {message && <p style={styles.message}>{message}</p>}

        {loading ? (
          <p style={styles.status}>Loading…</p>
        ) : albums.length === 0 ? (
          <p style={styles.status}>No albums yet — create one above.</p>
        ) : (
          <div style={styles.list}>
            {albums.map((album) => (
              <div key={album.id} style={styles.card}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={styles.cardTitle}>{album.title}</p>
                  <p style={styles.cardLink}>{origin}/album/{album.slug}</p>
                </div>
                <div style={styles.cardActions}>
                  <button style={styles.smallBtn} onClick={() => copyLink(album.slug)}>Copy link</button>
                  <a
                    href={`/admin/album/${album.id}`}
                    style={{ ...styles.smallBtn, textDecoration: 'none', display: 'inline-block' }}
                  >
                    Manage
                  </a>
                  <a
                    href={`/album/${album.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ ...styles.smallBtn, textDecoration: 'none', display: 'inline-block' }}
                  >
                    View
                  </a>
                  <button
                    style={styles.deleteBtn}
                    onClick={() => handleDelete(album.id, album.title)}
                    disabled={deletingId === album.id}
                  >
                    {deletingId === album.id ? '…' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

const styles = {
  page: { maxWidth: 800, margin: '0 auto', padding: '32px 16px 80px' },
  topbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  h1: { margin: 0, fontSize: 24, fontWeight: 600 },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid #2c2a27',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 14,
    color: '#ece7e0',
    cursor: 'pointer',
  },
  createBox: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  input: {
    flex: 1,
    minWidth: 200,
    background: '#1a1918',
    border: '1px solid #2c2a27',
    borderRadius: 8,
    padding: '10px 12px',
    color: '#ece7e0',
    fontSize: 15,
  },
  createBtn: {
    background: '#c9a15a',
    color: '#121110',
    border: 'none',
    borderRadius: 8,
    padding: '10px 18px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  message: { color: '#9a938a', fontSize: 14, marginTop: 4, marginBottom: 20 },
  status: { color: '#9a938a', textAlign: 'center', padding: '40px 0' },
  list: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: '#1a1918',
    border: '1px solid #2c2a27',
    borderRadius: 10,
    padding: '14px 16px',
    flexWrap: 'wrap',
  },
  cardTitle: { margin: 0, fontWeight: 600, fontSize: 16 },
  cardLink: { margin: '4px 0 0', fontSize: 13, color: '#9a938a', wordBreak: 'break-all' },
  cardActions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  smallBtn: {
    background: 'transparent',
    border: '1px solid #2c2a27',
    borderRadius: 6,
    padding: '6px 10px',
    fontSize: 13,
    color: '#ece7e0',
    cursor: 'pointer',
  },
  deleteBtn: {
    background: 'transparent',
    border: '1px solid #c25b4d',
    borderRadius: 6,
    padding: '6px 10px',
    fontSize: 13,
    color: '#c25b4d',
    cursor: 'pointer',
  },
};
