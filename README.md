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