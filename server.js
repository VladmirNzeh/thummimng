import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
dotenv.config();
import fetch from "node-fetch";
import { chunkText } from "./utils/chunker.js";

// ✅ Modular LangChain imports
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { ChatPromptTemplate } from "@langchain/core/prompts";

const PORT = process.env.PORT || 8080;
const CHROMA_COLLECTION = process.env.CHROMA_COLLECTION || "thummimng";
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files from public directory

let vectorStore = null;
let qaChain = null;

async function initVectorStore() {
  const embeddings = new OpenAIEmbeddings({
    model: EMBEDDING_MODEL,
    apiKey: OPENAI_API_KEY,
  });

  vectorStore = await Chroma.fromTexts([], [], embeddings, {
    collectionName: CHROMA_COLLECTION,
    url: process.env.CHROMA_SERVER_URL,
  });

  const llm = new ChatOpenAI({
    temperature: 0.2,
    apiKey: OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || "gpt-4",
  });

  // 🧠 Build RAG pipeline (prompt → combineDocsChain → retrievalChain)
  const prompt = ChatPromptTemplate.fromTemplate(`
You are a knowledgeable assistant. Use ONLY the provided context to answer.
Context:
{context}

Question:
{input}
`);

  const combineDocsChain = await createStuffDocumentsChain({
    llm,
    prompt,
  });

  qaChain = await createRetrievalChain({
    retriever: vectorStore.asRetriever(),
    combineDocsChain,
  });

  console.log("✅ RAG pipeline initialized successfully");
}

// 🔍 Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", vectorStore: !!vectorStore });
});

// Input validation middleware
const validateIngest = (req, res, next) => {
  const { documents } = req.body;
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
  next();
};

const validateQuery = (req, res, next) => {
  const { query } = req.body;
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return res.status(400).json({ error: "Query must be a non-empty string" });
  }
  next();
};

// Ingest documents
app.post("/ingest", validateIngest, async (req, res) => {
  try {
    const docs = req.body.documents;
    const texts = [];
    const metadatas = [];

    for (const doc of docs) {
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

    res.json({ success: true, added: texts.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Query endpoint
app.post("/query", validateQuery, async (req, res) => {
  if (!vectorStore || !qaChain) {
    return res.status(503).json({ error: "Server is still initializing" });
  }
  try {
    const question = req.body.query;
    const result = await qaChain.invoke({ input: question });
    res.json({ 
      answer: result.answer || result.output_text,
      metadata: {
        timestamp: new Date().toISOString(),
        model: process.env.OPENAI_MODEL || "gpt-4"
      }
    });
  } catch (err) {
    // Detect OpenAI quota / rate-limit errors and surface a helpful response
    console.error("Query error:", err);

    const message = (err && err.message) ? err.message.toLowerCase() : "";
    const status = err && (err.status || err.statusCode || err.status_code);

    const isQuotaOrRateLimit = 
      status === 429 ||
      message.includes("quota") ||
      message.includes("insufficientquotaerror") ||
      message.includes("rate limit") ||
      message.includes("rate_limit");

    if (isQuotaOrRateLimit) {
      return res.status(429).json({
        error: "OpenAI quota or rate limit exceeded.",
        detail: "Your OpenAI plan may be out of quota or requests are being rate-limited. Check your billing, usage, and consider using a smaller model or retrying later.",
        docs: "https://platform.openai.com/docs/guides/error-codes/api-errors",
        troubleshooting: "https://js.langchain.com/docs/troubleshooting/errors/MODEL_RATE_LIMIT/",
        timestamp: new Date().toISOString()
      });
    }

    // Generic fallback for other errors
    res.status(500).json({ 
      error: "An internal error occurred while processing your query.",
      requestId: Date.now()
    });
  }
});

// Graceful shutdown handler
const shutdown = async () => {
  console.log("Shutting down gracefully...");
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Initialize and start server
const startServer = async () => {
  try {
    await initVectorStore();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log("✅ Vector store and RAG pipeline initialized");
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

startServer();
