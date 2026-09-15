import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { isAuthenticated } from "../../lib/auth";

export async function getServerSideProps({ req }) {
  if (!isAuthenticated(req)) {
    return { redirect: { destination: "/admin", permanent: false } };
  }
  return { props: {} };
}

export default function Dashboard() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const fileInputRef = useRef(null);
  const router = useRouter();

  async function loadPhotos() {
    setLoading(true);
    const res = await fetch("/api/photos", { cache: "no-store" });
    const data = await res.json();
    setPhotos(data.photos || []);
    setLoading(false);
  }

  useEffect(() => {
    loadPhotos();
  }, []);

  async function handleUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setMessage("");
    const formData = new FormData();
    for (const file of files) formData.append("photos", file);

    try {
      const res = await fetch("/api/photos/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage(
          `Uploaded ${files.length} photo${files.length > 1 ? "s" : ""}.`,
        );
        await loadPhotos();
      } else {
        setMessage(data.error || "Upload failed.");
      }
    } catch (err) {
      setMessage("Upload failed. Check your connection.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this photo? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/photos/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== id));
      } else {
        setMessage("Failed to delete photo.");
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin");
  }

  return (
    <>
      <Head>
        <title>Admin Dashboard</title>
      </Head>
      <div style={styles.page}>
        <div style={styles.topbar}>
          <h1 style={styles.h1}>Manage Photos</h1>
          <div style={{ display: "flex", gap: 10 }}>
            <a href="/" target="_blank" rel="noreferrer" style={styles.linkBtn}>
              View gallery
            </a>
            <button onClick={handleLogout} style={styles.logoutBtn}>
              Log out
            </button>
          </div>
        </div>

        <div style={styles.uploadBox}>
          <label style={styles.uploadLabel}>
            {uploading ? "Uploading…" : "+ Add photos"}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              disabled={uploading}
              style={{ display: "none" }}
            />
          </label>
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
                <img src={photo.thumbJpg} alt="" style={styles.thumb} />
                <button
                  onClick={() => handleDelete(photo.id)}
                  disabled={deletingId === photo.id}
                  style={styles.deleteBtn}
                  aria-label="Delete photo"
                >
                  {deletingId === photo.id ? "…" : "🗑"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

const styles = {
  page: { maxWidth: 1000, margin: "0 auto", padding: "32px 16px 80px" },
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    flexWrap: "wrap",
    gap: 12,
  },
  h1: { margin: 0, fontSize: 24, fontWeight: 600 },
  linkBtn: {
    background: "transparent",
    border: "1px solid #2c2a27",
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 14,
    textDecoration: "none",
    color: "#ece7e0",
  },
  logoutBtn: {
    background: "transparent",
    border: "1px solid #2c2a27",
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 14,
    color: "#ece7e0",
    cursor: "pointer",
  },
  uploadBox: {
    border: "1px dashed #2c2a27",
    borderRadius: 12,
    padding: 24,
    textAlign: "center",
    marginBottom: 32,
  },
  uploadLabel: {
    display: "inline-block",
    background: "#c9a15a",
    color: "#121110",
    fontWeight: 600,
    padding: "12px 20px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 15,
  },
  message: { marginTop: 12, color: "#9a938a", fontSize: 14 },
  status: { color: "#9a938a", textAlign: "center", padding: "40px 0" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: 10,
  },
  card: {
    position: "relative",
    aspectRatio: "1 / 1",
    borderRadius: 8,
    overflow: "hidden",
    background: "#1a1918",
  },
  thumb: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  deleteBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    background: "rgba(20,18,16,0.85)",
    border: "none",
    borderRadius: "50%",
    width: 32,
    height: 32,
    color: "#ece7e0",
    cursor: "pointer",
    fontSize: 15,
  },
};
