import convert from 'heic-convert';

const HEIC_SIGNATURES = ['heic', 'heif', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'];

// Detects HEIC/HEIF by checking the ISO base media file "ftyp" box,
// which is more reliable than trusting the browser-supplied mimetype
// (iPhones/Safari sometimes send inconsistent or missing types).
export function looksLikeHeic(buffer, filename) {
  if (filename && /\.(heic|heif)$/i.test(filename)) return true;
  if (!buffer || buffer.length < 12) return false;
  const brand = buffer.toString('ascii', 8, 12).toLowerCase().trim();
  return HEIC_SIGNATURES.includes(brand);
}

export async function convertHeicToJpegBuffer(buffer) {
  const output = await convert({ buffer, format: 'JPEG', quality: 0.94 });
  return Buffer.from(output);
}
