import { extractText, getDocumentProxy } from "unpdf";

/** Extract raw text from a resume PDF buffer. */
export async function extractPdfText(
  data: ArrayBuffer | Uint8Array,
): Promise<string> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return text.replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").trim();
}
