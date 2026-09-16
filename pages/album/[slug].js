import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useSpring,
} from 'framer-motion';

function TiltFrame({ photo, index, onOpen }) {
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  const springConfig = { stiffness: 200, damping: 20 };
  const rotateX = useSpring(useTransform(y, [0, 1], [12, -12]), springConfig);
  const rotateY = useSpring(useTransform(x, [0, 1], [-12, 12]), springConfig);

  function handlePointerMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width);
    y.set((e.clientY - rect.top) / rect.height);
  }

  function handlePointerLeave() {
    x.set(0.5);
    y.set(0.5);
  }

  return (
    <motion.div
      style={{ ...styles.frame, rotateX, rotateY, transformPerspective: 800 }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={() => onOpen(index)}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      tabIndex={0}
      role="button"
      aria-label={`Open photo ${index + 1}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(index); }
      }}
    >
      <motion.div layoutId={`photo-${photo.id}`} style={styles.frameInner}>
        <picture>
          <source srcSet={photo.thumbWebp} type="image/webp" />
          <img
            src={photo.thumbJpg}
            alt={photo.caption || `Photo ${index + 1}`}
            loading="lazy"
            decoding="async"
            style={styles.img}
          />
        </picture>
      </motion.div>
    </motion.div>
  );
}

export default function AlbumPage() {
  const router = useRouter();
  const { slug } = router.query;

  const [title, setTitle] = useState('');
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    fetch(`/api/public/album/${encodeURIComponent(slug)}`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) {
          setTitle(data.title || 'Photo Album');
          setPhotos(data.photos || []);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    document.body.style.overflow = current !== null ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [current]);

  useEffect(() => {
    function onKey(e) {
      if (current === null) return;
      if (e.key === 'Escape') setCurrent(null);
      if (e.key === 'ArrowRight') setCurrent((c) => (c + 1) % photos.length);
      if (e.key === 'ArrowLeft') setCurrent((c) => (c - 1 + photos.length) % photos.length);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [current, photos.length]);

  function handleDragEnd(e, info) {
    const threshold = 80;
    if (info.offset.x < -threshold) {
      setCurrent((c) => (c + 1) % photos.length);
    } else if (info.offset.x > threshold) {
      setCurrent((c) => (c - 1 + photos.length) % photos.length);
    }
  }

  const activePhoto = current !== null ? photos[current] : null;

  return (
    <>
      <Head>
        <title>{title || 'Photo Album'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <header style={styles.header}>
        <h1 style={styles.h1}>{title || 'Photo Album'}</h1>
        <p style={styles.tagline}>Scan. Look. Remember.</p>
      </header>

      <main style={styles.main}>
        {loading ? (
          <p style={styles.status}>Loading photos&hellip;</p>
        ) : notFound ? (
          <p style={styles.status}>This album doesn&rsquo;t exist or was removed.</p>
        ) : photos.length === 0 ? (
          <p style={styles.status}>No photos yet.</p>
        ) : (
          <div style={styles.grid}>
            {photos.map((photo, i) => (
              <TiltFrame key={photo.id} photo={photo} index={i} onOpen={setCurrent} />
            ))}
          </div>
        )}
      </main>

      {!notFound && photos.length > 0 && (
        <footer style={styles.footer}>
          Tap any photo to view full size &middot; swipe or use arrow keys to browse
        </footer>
      )}

      <AnimatePresence>
        {activePhoto && (
          <motion.div
            style={styles.lightbox}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setCurrent(null); }}
          >
            <div style={styles.lightboxContent}>
              <motion.div
                key={activePhoto.id}
                layoutId={`photo-${activePhoto.id}`}
                style={styles.stage}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragEnd={handleDragEnd}
                initial={{ rotateY: -20, rotateX: 10 }}
                animate={{ rotateY: 0, rotateX: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              >
                <picture>
                  <source srcSet={activePhoto.fullWebp} type="image/webp" />
                  <img
                    src={activePhoto.fullJpg}
                    alt={activePhoto.caption || `Photo ${current + 1}`}
                    style={styles.slideImg}
                    draggable={false}
                  />
                </picture>
              </motion.div>
              {activePhoto.caption && (
                <p style={styles.caption}>{activePhoto.caption}</p>
              )}
            </div>

            <button
              style={{ ...styles.navBtn, top: 16, right: 16, borderRadius: '50%', width: 42, height: 42, fontSize: 22 }}
              onClick={() => setCurrent(null)}
              aria-label="Close"
            >
              &times;
            </button>
            <button
              style={{ ...styles.navBtn, left: 12, top: '50%', transform: 'translateY(-50%)', borderRadius: '50%', width: 46, height: 46, fontSize: 20 }}
              onClick={() => setCurrent((c) => (c - 1 + photos.length) % photos.length)}
              aria-label="Previous"
            >
              &#10094;
            </button>
            <button
              style={{ ...styles.navBtn, right: 12, top: '50%', transform: 'translateY(-50%)', borderRadius: '50%', width: 46, height: 46, fontSize: 20 }}
              onClick={() => setCurrent((c) => (c + 1) % photos.length)}
              aria-label="Next"
            >
              &#10095;
            </button>
            <div style={styles.counter}>{current + 1} / {photos.length}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const styles = {
  header: {
    padding: '56px 24px 36px',
    textAlign: 'center',
    borderBottom: '1px solid #2c2a27',
    fontFamily: "'Iowan Old Style','Palatino Linotype',Georgia,serif",
  },
  h1: { margin: 0, fontSize: 'clamp(26px,6vw,44px)', fontWeight: 500 },
  tagline: { margin: '12px 0 0', color: '#9a938a', fontSize: 14 },
  main: { maxWidth: 1100, margin: '0 auto', padding: '32px 12px 80px' },
  status: { textAlign: 'center', color: '#9a938a', padding: '40px 0' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: 6,
  },
  frame: {
    position: 'relative',
    aspectRatio: '1 / 1',
    cursor: 'pointer',
  },
  frameInner: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    background: '#1a1918',
    borderRadius: 2,
  },
  img: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  footer: {
    textAlign: 'center',
    padding: '32px 16px 48px',
    color: '#9a938a',
    fontSize: 13,
  },
  lightbox: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(9,8,7,0.97)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  lightboxContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    maxWidth: '86vw',
    maxHeight: '90vh',
  },
  stage: {
    maxWidth: '86vw',
    maxHeight: '78vh',
    cursor: 'grab',
  },
  slideImg: { maxWidth: '100%', maxHeight: '78vh', objectFit: 'contain', display: 'block' },
  caption: {
    marginTop: 16,
    color: '#ece7e0',
    fontFamily: "'Iowan Old Style','Palatino Linotype',Georgia,serif",
    fontSize: 16,
    textAlign: 'center',
    maxWidth: '80vw',
  },
  navBtn: {
    position: 'absolute',
    color: '#ece7e0',
    background: 'rgba(255,255,255,0.06)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 101,
  },
  counter: {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: 13,
    color: '#9a938a',
    zIndex: 101,
  },
};
