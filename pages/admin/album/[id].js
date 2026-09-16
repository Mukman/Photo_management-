import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { isAuthenticated } from '../../../lib/auth';
import { getAlbumById } from '../../../lib/albums';

export async function getServerSideProps({ req, params }) {
  if (!isAuthenticated(req)) {
    return { redirect: { destination: '/admin', permanent: false } };
  }
  const album = await getAlbumById(params.id);
  if (!album) {
    return { notFound: true };
  }
  return { props: { album } };
}

export default function ManageAlbum({ album }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [captionDrafts, setCaptionDrafts] = useState({});
  const [savingCaptionId, setSavingCaptionId] = useState(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const router = useRouter();

  async function loadPhotos() {
    setLoading(true);
    const res = await fetch(`/api/albums/${album.id}/photos`, { cache: 'no-store' });
    const data = await res.json();
    const list = data.photos || [];
    setPhotos(list);
    setCaptionDrafts(Object.fromEntries(list.map((p) => [p.id, p.caption || ''])));
    setLoading(false);
  }

  useEffect(() => { loadPhotos(); }, []);

  async function handleUpload(e) {
    const rawFiles = Array.from(e.target.files || []);
    const files = rawFiles.filter(
      (f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name)
    );
    if (files.length === 0) return;

    setUploading(true);
    setMessage('');
    const formData = new FormData();
    for (const file of files) formData.append('photos', file);

    try {
      const res = await fetch(`/api/albums/${album.id}/photos`, { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage(`Uploaded ${files.length} photo${files.length > 1 ? 's' : ''}.`);
        await loadPhotos();
      } else {
        setMessage(data.error || 'Upload failed.');
      }
    } catch (err) {
      setMessage('Upload failed. Check your connection.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  }

  async function handleDelete(photoId) {
    if (!confirm('Delete this photo? This cannot be undone.')) return;
    setDeletingId(photoId);
    try {
      const res = await fetch(`/api/albums/${album.id}/photos/${photoId}`, { method: 'DELETE' });
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      } else {
        setMessage('Failed to delete photo.');
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSaveCaption(photoId) {
    setSavingCaptionId(photoId);
    try {
      const res = await fetch(`/api/albums/${album.id}/photos/${photoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: captionDrafts[photoId] || '' }),
      });
      if (!res.ok) setMessage('Failed to save caption.');
    } finally {
      setSavingCaptionId(null);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin');
  }

  return (
    <>
      <Head><title>Manage {album.title}</title></Head>
      <div style={styles.page}>
        <div style={styles.topbar}>
          <div>
            <a href="/admin/dashboard" style={styles.backLink}>&larr; All albums</a>
            <h1 style={styles.h1}>{album.title}</h1>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <a href={`/album/${album.slug}`} target="_blank" rel="noreferrer" style={styles.linkBtn}>View gallery</a>
            <button onClick={handleLogout} style={styles.logoutBtn}>Log out</button>
          </div>
        </div>

        <div style={styles.uploadBox}>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <label style={styles.uploadLabel}>
              {uploading ? 'Uploading…' : '+ Add photos'}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.heic,.heif"
                multiple
                onChange={handleUpload}
                disabled={uploading}
                style={{ display: 'none' }}
              />
            </label>
            <label style={styles.uploadLabelSecondary}>
              {uploading ? 'Uploading…' : '+ Add a folder'}
              <input
                ref={folderInputRef}
                type="file"
                accept="image/*,.heic,.heif"
                multiple
                webkitdirectory=""
                directory=""
                onChange={handleUpload}
                disabled={uploading}
                style={{ display: 'none' }}
              />
            </label>
          </div>
          <p style={styles.hint}>Supports JPEG, PNG, WebP, and iPhone HEIC/HEIF photos.</p>
          {message && <p style={styles.message}>{message}</p>}
        </div>

        {loading ? (
          <p style={styles.status}>Loading…</p>
        ) : photos.length === 0 ? (
          <p style={styles.status}>No photos yet — add some above.</p>
        ) : (
          <div style={styles.grid}>
            {photos.map((photo) => (
              <div key={photo.id} style={styles.card}>
                <div style={styles.thumbWrap}>
                  <img src={photo.thumbJpg} alt="" style={styles.thumb} />
                  <button
                    onClick={() => handleDelete(photo.id)}
                    disabled={deletingId === photo.id}
                    style={styles.deleteBtn}
                    aria-label="Delete photo"
                  >
                    {deletingId === photo.id ? '…' : '🗑'}
                  </button>
                </div>
                <div style={styles.captionRow}>
                  <input
                    style={styles.captionInput}
                    placeholder="Add a caption…"
                    value={captionDrafts[photo.id] ?? ''}
                    onChange={(e) =>
                      setCaptionDrafts((prev) => ({ ...prev, [photo.id]: e.target.value }))
                    }
                  />
                  <button
                    style={styles.saveBtn}
                    onClick={() => handleSaveCaption(photo.id)}
                    disabled={savingCaptionId === photo.id}
                  >
                    {savingCaptionId === photo.id ? '…' : 'Save'}
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
  page: { maxWidth: 1000, margin: '0 auto', padding: '32px 16px 80px' },
  topbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 12,
  },
  backLink: { fontSize: 13, color: '#9a938a', textDecoration: 'none' },
  h1: { margin: '6px 0 0', fontSize: 24, fontWeight: 600 },
  linkBtn: {
    background: 'transparent',
    border: '1px solid #2c2a27',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 14,
    textDecoration: 'none',
    color: '#ece7e0',
  },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid #2c2a27',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 14,
    color: '#ece7e0',
    cursor: 'pointer',
  },
  uploadBox: {
    border: '1px dashed #2c2a27',
    borderRadius: 12,
    padding: 24,
    textAlign: 'center',
    marginBottom: 32,
  },
  uploadLabel: {
    display: 'inline-block',
    background: '#c9a15a',
    color: '#121110',
    fontWeight: 600,
    padding: '12px 20px',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 15,
  },
  uploadLabelSecondary: {
    display: 'inline-block',
    background: 'transparent',
    border: '1px solid #c9a15a',
    color: '#c9a15a',
    fontWeight: 600,
    padding: '12px 20px',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 15,
  },
  hint: { marginTop: 12, color: '#9a938a', fontSize: 13 },
  message: { marginTop: 8, color: '#9a938a', fontSize: 14 },
  status: { color: '#9a938a', textAlign: 'center', padding: '40px 0' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 14,
  },
  card: { display: 'flex', flexDirection: 'column', gap: 6 },
  thumbWrap: {
    position: 'relative',
    aspectRatio: '1 / 1',
    borderRadius: 8,
    overflow: 'hidden',
    background: '#1a1918',
  },
  thumb: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  deleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    background: 'rgba(20,18,16,0.85)',
    border: 'none',
    borderRadius: '50%',
    width: 32,
    height: 32,
    color: '#ece7e0',
    cursor: 'pointer',
    fontSize: 15,
  },
  captionRow: { display: 'flex', gap: 6 },
  captionInput: {
    flex: 1,
    minWidth: 0,
    background: '#1a1918',
    border: '1px solid #2c2a27',
    borderRadius: 6,
    padding: '6px 8px',
    color: '#ece7e0',
    fontSize: 13,
  },
  saveBtn: {
    background: 'transparent',
    border: '1px solid #2c2a27',
    borderRadius: 6,
    padding: '6px 10px',
    fontSize: 12,
    color: '#ece7e0',
    cursor: 'pointer',
  },
};
