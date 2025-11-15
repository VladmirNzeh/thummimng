import { getCached } from "./_init.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { vectorStore, qaChain } = getCached();
  res.status(200).json({ status: "ok", vectorStore: !!vectorStore, qaChain: !!qaChain });
}
