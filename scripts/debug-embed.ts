import "dotenv/config";

async function main() {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.EMBED_MODEL || "models/text-embedding-004";
  const url = `https://generativelanguage.googleapis.com/v1beta/${model}:embedContents?key=${encodeURIComponent(key || "")}`;
  const body = { model, content: { parts: [{ text: "hello world" }] } };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  console.log("status", res.status);
  console.log(await res.text());
}
main();
