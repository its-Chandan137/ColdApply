import "dotenv/config";

async function t(model: string, ep: string) {
  const key = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/${model}:${ep}?key=${encodeURIComponent(key || "")}`;
  const body = { model, content: { parts: [{ text: "hello" }] } };
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const txt = await r.text();
  console.log(ep, model, r.status, txt.slice(0, 180));
}

(async () => {
  await t("models/text-embedding-004", "embedContent");
  await t("models/text-embedding-004", "embedContents");
  await t("models/embedding-001", "embedContent");
  await t("models/gemini-embedding-001", "embedContent");
})();
