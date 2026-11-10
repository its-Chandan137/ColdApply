import { chromium, type Page } from "playwright";

/**
 * UI E2E tests that do NOT need API keys: profile CRUD, job add (scoring
 * failure is surfaced, not silent), contact extraction, approve flow,
 * dashboard status/notes/filters, error panel.
 *
 * Run: npx tsx scripts/e2e.ts   (dev server must be on :3000)
 */

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean, extra = "") {
  if (cond) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}${extra ? ` — ${extra}` : ""}`);
  }
}

async function textExists(
  page: Page,
  text: string,
  timeout = 15000,
): Promise<boolean> {
  try {
    await page.getByText(text, { exact: false }).first().waitFor({ timeout });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on("dialog", (d) => void d.accept());
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));

  // --- Feature 1: profile section CRUD -----------------------------------
  console.log("\n[1] Profile sections");
  await page.goto(`${BASE}/profile`);
  await page.getByRole("button", { name: "+ Add section" }).click();
  const addForm = page
    .locator("form")
    .filter({ has: page.locator('textarea[name="content"]') })
    .last();
  await addForm.locator('input[name="title"]').fill("E2E Test Skill");
  await addForm.locator('select[name="type"]').selectOption("skill");
  await addForm
    .locator('textarea[name="content"]')
    .fill("TypeScript, Node.js, Playwright and PostgreSQL for test automation.");
  await addForm.locator('button[type="submit"]').click();
  check(
    "section created (embedding failure surfaced, not silent)",
    await textExists(page, "Section added") ||
      (await textExists(page, "embedding failed")),
  );
  check("section card visible", await textExists(page, "E2E Test Skill"));

  // Edit - the Edit button on the section card that contains the title text
  const editBtn = page.getByRole("button", { name: "Edit" }).first();
  await editBtn.click();
  const editForm = page
    .locator("form")
    .filter({ has: page.locator('textarea[name="content"]') })
    .last();
  await editForm
    .locator('textarea[name="content"]')
    .fill("TypeScript, Node.js, Playwright, PostgreSQL and GraphQL.");
  await editForm
    .locator('button[type="submit"]:has-text("Save")')
    .click();
  check(
    "section save + re-embed path reports result",
    (await textExists(page, "Section saved and re-embedded.")) ||
      (await textExists(page, "re-embedding failed")),
  );

  // After saving we are still in edit mode; cancel to return to view mode
  // where the Delete button lives.
  const cancelBtn = page.getByRole("button", { name: "Cancel" }).first();
  if (await cancelBtn.isVisible().catch(() => false)) {
    await cancelBtn.click();
  }

  // Delete - button containing exact text "Delete"
  const deleteBtn = page.getByRole("button", { name: "Delete" }).first();
  await deleteBtn.click();
  await page.waitForTimeout(2500);
  check("section deleted", !(await textExists(page, "E2E Test Skill", 4000)));

  // --- Feature 2: job add with scoring failure surfaced -------------------
  console.log("\n[2] Jobs");
  await page.goto(`${BASE}/jobs`);
  await page.getByRole("button", { name: "+ Add job" }).click();
  const jobForm = page
    .locator("form")
    .filter({ has: page.locator('textarea[name="description"]') })
    .last();
  await jobForm.locator('input[name="title"]').fill("E2E Platform Engineer");
  await jobForm.locator('input[name="company"]').fill("E2E Corp");
  await jobForm
    .locator('textarea[name="description"]')
    .fill(
      "Looking for a platform engineer. Contact us at jobs@e2e-corp.example for details.",
    );
  await jobForm
    .locator('button[type="submit"]:has-text("Save & score")')
    .click();
  check(
    "job save reports scoring result (no silent failure)",
    (await textExists(page, "Scoring failed")) || (await textExists(page, "Scored")),
  );
  check("job appears in list", await textExists(page, "E2E Platform Engineer"));

  // --- Feature 3: contact extraction + manual add -------------------------
  console.log("\n[3] Contacts");
  await page.goto(`${BASE}/contacts`);
  check(
    "email extracted from job description",
    await textExists(page, "jobs@e2e-corp.example"),
  );

  const contactForm = page
    .locator("form")
    .filter({ has: page.locator('input[name="email"]') })
    .first();
  await contactForm.locator("select[name=jobId]").selectOption({ index: 1 });
  await contactForm.locator('input[name="email"]').fill("manual@e2e-corp.example");
  await contactForm.locator('input[name="name"]').fill("Manual Person");
  await contactForm
    .locator('button[type="submit"]:has-text("Add contact")')
    .click();
  await page
    .getByText("manual@e2e-corp.example")
    .first()
    .waitFor({ timeout: 15000 });
  check("manual contact added", true);

  // --- Feature 4: approve flow on seeded draft ----------------------------
  console.log("\n[4] Outreach approve flow");
  await page.goto(`${BASE}/outreach`);
  check(
    "seeded draft visible",
    await textExists(page, "Senior Backend Engineer - 6 yrs"),
  );
  const draftCard = page
    .locator("div.rounded-lg")
    .filter({ hasText: "Senior Backend Engineer - 6 yrs" })
    .first();
  await draftCard.getByRole("button", { name: "Approve" }).click();
  await draftCard.getByRole("button", { name: "Send now" }).waitFor({
    timeout: 20000,
  });
  check("draft approved (Send now appeared)", true);

  // --- Feature 7: dashboard status, notes, filters, errors ----------------
  console.log("\n[5] Dashboard");
  await page.goto(`${BASE}/`);
  check("stats cards render", await textExists(page, "Sent today"));
  check(
    "approved outreach row present",
    await textExists(page, "Northwind Labs"),
  );

  const row = page
    .locator("tbody tr")
    .filter({ hasText: "Northwind Labs" })
    .first();
  await row.locator('select[name="status"]').selectOption("bounced");
  check(
    "status dropdown update",
    await row.locator('select[name="status"]').inputValue().then((v) => v === "bounced"),
  );

  await row.getByText("+ notes").click();
  const notesForm = row.locator("form");
  await notesForm.locator('textarea[name="notes"]').fill("e2e note: left a voicemail");
  await notesForm.locator('button[type="submit"]:has-text("Save")').click();
  check("notes saved", await textExists(page, "e2e note: left a voicemail"));

  await row.locator('select[name="status"]').selectOption("approved");

  await page.goto(`${BASE}/?status=approved`);
  check(
    "filter status=approved shows row",
    await textExists(page, "Northwind Labs"),
  );
  await page.goto(`${BASE}/?status=offer`);
  check(
    "filter status=offer hides row",
    !(await textExists(page, "Northwind Labs", 4000)),
  );

  await page.goto(`${BASE}/`);
  check(
    "recent errors panel surfaces logged failures",
    await textExists(page, "Recent errors"),
  );

  check("no uncaught page errors", pageErrors.length === 0, pageErrors.join(" | "));

  await browser.close();

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
