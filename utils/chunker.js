export function chunkText(text, maxChunkSize = 800, overlap = 100) {
  if (!text) return [];
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + maxChunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap > start ? end - overlap : end;
  }
  return chunks;
}