export interface TextChunk {
  text: string;
  start: number;
  length: number;
}

/**
 * Split text into overlapping chunks suitable for embedding.
 * Tries to break on whitespace boundaries so words are not split in half.
 */
export function chunkText(
  text: string,
  opts?: { maxChunkChars?: number; overlap?: number },
): TextChunk[] {
  const maxChunkChars = opts?.maxChunkChars ?? 2000;
  const overlap = opts?.overlap ?? 200;
  const content = text ?? '';

  if (content.length === 0) {
    return [];
  }
  if (content.length <= maxChunkChars) {
    return [{ text: content, start: 0, length: content.length }];
  }

  const chunks: TextChunk[] = [];
  let start = 0;
  while (start < content.length) {
    let end = Math.min(start + maxChunkChars, content.length);
    if (end < content.length) {
      // back up to a whitespace boundary so we don't split a word
      while (end > start && !/\s/.test(content[end - 1])) {
        end--;
      }
      if (end === start) {
        // no whitespace found; fall back to a hard cut
        end = Math.min(start + maxChunkChars, content.length);
      }
    }
    chunks.push({ text: content.slice(start, end), start, length: end - start });
    if (end >= content.length) {
      break;
    }
    start = Math.max(end - overlap, 0);
  }
  return chunks;
}
