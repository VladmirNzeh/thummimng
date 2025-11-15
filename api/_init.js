import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { ChatPromptTemplate } from "@langchain/core/prompts";

let cached = {
  vectorStore: null,
  qaChain: null,
  initializing: null,
};

export async function initOnce() {
  if (cached.vectorStore && cached.qaChain) return cached;
  if (cached.initializing) return cached.initializing;

  cached.initializing = (async () => {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const USE_MOCK = (process.env.USE_MOCK || process.env.DEMO_MODE || '').toLowerCase() === 'true';

    // If mock/demo mode is requested or the API key is missing, don't throw —
    // instead initialize lightweight in-memory mocks so the app can deploy
    // successfully on Vercel for demos.
    const shouldMock = USE_MOCK || !OPENAI_API_KEY;

    const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
    const CHROMA_COLLECTION = process.env.CHROMA_COLLECTION || "thummimng";

    // Initialize embeddings and vector store. If mocking, create simple
    // in-memory no-op implementations so functions won't fail at runtime.
    let vectorStore;
    let qaChain;

    if (shouldMock) {
      console.warn('Running in MOCK mode (USE_MOCK=true or OPENAI_API_KEY missing). Using in-memory mocks.');

      // Minimal in-memory vectorStore mock
      vectorStore = {
        _docs: [],
        addDocuments: async (docs) => {
          for (const d of docs) {
            vectorStore._docs.push(d);
          }
        },
        asRetriever: () => ({
          getRelevantDocuments: async (query) => vectorStore._docs,
          // LangChain may call different method names; keep a flexible API
          retrieve: async (q) => vectorStore._docs,
        }),
      };

      // Minimal qaChain mock with an invoke method
      qaChain = {
        invoke: async ({ input }) => ({
          answer: `DEMO: no OpenAI key provided or mock mode enabled. Received query: ${String(input).slice(0,200)}`,
          output_text: `DEMO: no OpenAI key provided or mock mode enabled. Received query: ${String(input).slice(0,200)}`,
        }),
      };
    } else {
      try {
        const embeddings = new OpenAIEmbeddings({
          model: EMBEDDING_MODEL,
          apiKey: OPENAI_API_KEY,
        });

        const chromaUrl = process.env.CHROMA_SERVER_URL;
        if (!chromaUrl) {
          console.warn('CHROMA_SERVER_URL not set; Chroma may be unreachable from Vercel.');
        }

        vectorStore = await Chroma.fromTexts([], [], embeddings, {
          collectionName: CHROMA_COLLECTION,
          url: chromaUrl,
        });

        const llm = new ChatOpenAI({
          temperature: 0.2,
          apiKey: OPENAI_API_KEY,
          model: process.env.OPENAI_MODEL || "gpt-4",
        });

        const prompt = ChatPromptTemplate.fromTemplate(`\nYou are a knowledgeable assistant. Use ONLY the provided context to answer.\nContext:\n{context}\n\nQuestion:\n{input}\n`);

        const combineDocsChain = await createStuffDocumentsChain({ llm, prompt });

        qaChain = await createRetrievalChain({
          retriever: vectorStore.asRetriever(),
          combineDocsChain,
        });
      } catch (e) {
        // Enhance error message for common deployment problems
        const friendly = new Error(
          `Initialization failed: ${e.message}. ` +
            `Check that OPENAI_API_KEY is set and that CHROMA_SERVER_URL points to a reachable Chroma server (not localhost) from Vercel.`
        );
        // preserve original stack for server logs
        friendly.stack = e.stack;
        cached.initializing = null;
        throw friendly;
      }
    }

    cached.vectorStore = vectorStore;
    cached.qaChain = qaChain;
    cached.initializing = null;
    return cached;
  })();

  return cached.initializing;
}

export function getCached() {
  return cached;
}
