# ThummimNG RAG Backend

This project implements a Retrieval-Augmented Generation (RAG) API using Node.js, LangChain, OpenAI, and Chroma DB.

## Run locally
```
npm install
npm start
```

## Run with Docker
```
docker-compose up --build
```

## Test endpoints
```
curl http://localhost:8080/health
curl -X POST http://localhost:8080/query -H "Content-Type: application/json" -d '{"query":"What is ThummimNG?"}'
```

## Vercel deployment & required setup

1. Rotate your OpenAI API key immediately if it was stored in `.env` and may have been exposed. Create a new key in the OpenAI dashboard and revoke the old one.

2. Add environment variables in the Vercel project settings (or via the `vercel` CLI). Required:
	- `OPENAI_API_KEY` = your new OpenAI key
	- `CHROMA_SERVER_URL` = public URL for your Chroma server (Vercel cannot reach `localhost` or Docker service names)
	- Optional: `OPENAI_MODEL`, `EMBEDDING_MODEL`, `CHROMA_COLLECTION`, `USE_MOCK`

3. If you do not yet have a hosted Chroma instance, you can deploy with demo/mock mode by setting `USE_MOCK=true` in Vercel. This will allow the API to start and return demo responses without external services.

4. Helpful local debug commands:
```powershell
$env:OPENAI_API_KEY = 'sk-...'
$env:CHROMA_SERVER_URL = 'http://localhost:8000'  # only if Chroma runs locally and is reachable
npx vercel dev
```

5. There's a helper script at `scripts/vercel-env-setup.ps1` which guides adding environment variables via the Vercel CLI.

6. Runtime health endpoint: `GET /api/admin` (on Vercel this is `/api/admin`) will report whether the function is running in mock mode and whether the key/chroma URL are configured (it does not expose the key).

If you want, I can add automatic fallback support for a hosted vector DB (Pinecone/Supabase) and update configuration to use it.