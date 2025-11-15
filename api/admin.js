import { getCached } from "./_init.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const mockMode = (process.env.USE_MOCK || process.env.DEMO_MODE || '').toLowerCase() === 'true' || !process.env.OPENAI_API_KEY;
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
  const chromaUrl = process.env.CHROMA_SERVER_URL || null;
  const { vectorStore, qaChain } = getCached();

  res.status(200).json({
    ok: true,
    mockMode,
    hasOpenAIKey,
    chromaUrl,
    cachedVectorStore: !!vectorStore,
    cachedQaChain: !!qaChain,
    env: {
      openai_model: process.env.OPENAI_MODEL || null,
      embedding_model: process.env.EMBEDDING_MODEL || null,
      chroma_collection: process.env.CHROMA_COLLECTION || null,
    }
  });
}
