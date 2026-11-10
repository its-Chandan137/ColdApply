/** Split a text into overlapping chunks sized for embedding retrieval. */
export function chunkText(
  text: string,
  maxChars = 700,
  overlap = 120,
): string[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];

  // Prefer paragraph boundaries, then sentences.
  const paragraphs = clean.split(/\n{2,}/);
  const pieces: string[] = [];
  for (const p of paragraphs) {
    if (p.length <= maxChars) {
      pieces.push(p);
      continue;
    }
    const sentences = p.match(/[^.!?\n]+[.!?]?(\s+|$)/g) ?? [p];
    let buf = "";
    for (const s of sentences) {
      if ((buf + s).length > maxChars && buf) {
        pieces.push(buf.trim());
        buf = "";
      }
      buf += s;
      while (buf.length > maxChars) {
        pieces.push(buf.slice(0, maxChars));
        buf = buf.slice(maxChars - overlap);
      }
    }
    if (buf.trim()) pieces.push(buf.trim());
  }

  // Add overlap between pieces so cross-boundary facts are still found.
  const chunks: string[] = [];
  for (let i = 0; i < pieces.length; i++) {
    let piece = pieces[i].trim();
    if (i > 0 && overlap > 0) {
      const prev = pieces[i - 1];
      piece = `${prev.slice(-overlap)}\n${piece}`.trim();
    }
    if (piece) chunks.push(piece.slice(0, maxChars + overlap));
  }
  return chunks;
}
