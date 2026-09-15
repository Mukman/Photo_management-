import { listPhotos } from "../../../lib/blob";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const photos = await listPhotos();
    res.setHeader("Cache-Control", "no-store, must-revalidate");
    return res.status(200).json({ photos });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to list photos" });
  }
}
