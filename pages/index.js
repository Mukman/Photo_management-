import Head from 'next/head';

export default function Home() {
  return (
    <>
      <Head>
        <title>Photo Albums</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <div style={styles.page}>
        <h1 style={styles.h1}>Photo Albums</h1>
        <p style={styles.text}>
          Each album has its own link and QR code. Scan a QR code to view a
          specific album.
        </p>
      </div>
    </>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: 24,
    fontFamily: "'Iowan Old Style','Palatino Linotype',Georgia,serif",
  },
  h1: { margin: 0, fontSize: 'clamp(26px,6vw,40px)', fontWeight: 500 },
  text: { marginTop: 16, color: '#9a938a', maxWidth: 420, fontFamily: '-apple-system, sans-serif', fontSize: 15 },
};
