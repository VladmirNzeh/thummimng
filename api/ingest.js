import { initOnce, getCached } from "./_init.js";
import { chunkText } from "../utils/chunker.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { documents } = req.body || {};
  if (!Array.isArray(documents)) {
    return res.status(400).json({ error: "Documents must be an array" });
  }

  for (const doc of documents) {
    if (!doc.text || typeof doc.text !== "string") {
      return res.status(400).json({ error: "Each document must have a text field" });
    }
    if (!doc.id || !doc.title) {
      return res.status(400).json({ error: "Each document must have id and title fields" });
    }
  }

  try {
    await initOnce();
    const { vectorStore } = getCached();
    if (!vectorStore) {
      return res.status(503).json({ error: "Service initializing, try again shortly" });
    }

    const texts = [];
    const metadatas = [];

    for (const doc of documents) {
      const chunks = chunkText(doc.text || "", 800);
      for (let i = 0; i < chunks.length; i++) {
        texts.push(chunks[i]);
        metadatas.push({ id: doc.id, title: doc.title, chunk_index: i });
      }
    }

    await vectorStore.addDocuments(
      texts.map((t, i) => ({
        pageContent: t,
        metadata: metadatas[i],
      }))
    );

    return res.status(200).json({ success: true, added: texts.length });
  } catch (err) {
    console.error("Ingest handler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
