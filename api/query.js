import { initOnce, getCached } from "./_init.js";
import { chunkText } from "../utils/chunker.js";

function isQuotaOrRateLimitError(err) {
  const message = err && err.message ? err.message.toLowerCase() : "";
  const status = err && (err.status || err.statusCode || err.status_code);
  return (
    status === 429 ||
    message.includes("quota") ||
    message.includes("insufficientquotaerror") ||
    message.includes("rate limit") ||
    message.includes("rate_limit")
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { query } = req.body || {};
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return res.status(400).json({ error: "Query must be a non-empty string" });
  }

  try {
    await initOnce();
    const { qaChain } = getCached();
    if (!qaChain) {
      return res.status(503).json({ error: "Service initializing, try again shortly" });
    }

    const result = await qaChain.invoke({ input: query });

    return res.status(200).json({
      answer: result.answer || result.output_text || null,
      metadata: {
        timestamp: new Date().toISOString(),
        model: process.env.OPENAI_MODEL || "gpt-4",
      },
    });
  } catch (err) {
    console.error("Query handler error:", err);
    if (isQuotaOrRateLimitError(err)) {
      return res.status(429).json({
        error: "OpenAI quota or rate limit exceeded.",
        detail:
          "Your OpenAI plan may be out of quota or requests are being rate-limited. Check your billing, usage, and consider using a smaller model or retrying later.",
        docs: "https://platform.openai.com/docs/guides/error-codes/api-errors",
        troubleshooting: "https://js.langchain.com/docs/troubleshooting/errors/MODEL_RATE_LIMIT/",
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({ error: "Internal server error" });
  }
}
