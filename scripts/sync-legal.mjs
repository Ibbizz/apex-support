import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// The app's legal content is authoritative. Generate both public HTML pages and
// the legacy data script together; no third-party packages or build are needed.
const [sourcePath, ...flags] = process.argv.slice(2);
if (!sourcePath || sourcePath.startsWith("--") || flags.some(flag => flag !== "--check")) {
  throw new Error("Usage: node scripts/sync-legal.mjs /path/to/mobile/src/content/legal.ts [--check]");
}
const check = flags.includes("--check");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = await readFile(resolve(sourcePath), "utf8");
const marker = "export const LEGAL_POLICIES: Record<LegalDocument, LegalPolicy> = ";
const start = source.indexOf(marker);
const updated = source.match(/export const LEGAL_UPDATED = "([^"\n]+)";/)?.[1];
if (start === -1 || !updated) throw new Error("App legal source format was not recognised; no files changed.");
const policies = JSON.parse(source.slice(start + marker.length).trim().replace(/;$/, ""));
if (Object.keys(policies).sort().join(",") !== "privacy,terms") throw new Error("Expected privacy and terms policies.");
for (const policy of Object.values(policies)) {
  if (typeof policy.title !== "string" || !policy.title.trim() || typeof policy.intro !== "string" || !policy.intro.trim()
    || !Array.isArray(policy.sections) || !policy.sections.length
    || policy.sections.some(section => typeof section.title !== "string" || !section.title.trim()
      || typeof section.body !== "string" || !section.body.trim())
    || new Set(policy.sections.map(section => section.title)).size !== policy.sections.length) {
    throw new Error("Incomplete or duplicate legal sections; no files changed.");
  }
}
const escapeHtml = text => text.replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]);
const outputs = new Map();
for (const kind of ["privacy", "terms"]) {
  const path = `${kind}/index.html`;
  const original = await readFile(resolve(root, path), "utf8");
  const opening = original.indexOf('    <h1 class="page-title" id="legal-title">');
  const closing = original.indexOf("\n  </main>", opening);
  if (opening === -1 || closing === -1) throw new Error(`Unrecognised ${path} layout; no files changed.`);
  const policy = policies[kind];
  const sections = policy.sections.map((section, index) => `      <section class="legal-section">
        <h2>${index + 1}. ${escapeHtml(section.title)}</h2>
        <p>${escapeHtml(section.body)}</p>
      </section>`).join("\n");
  const content = `    <h1 class="page-title" id="legal-title">${escapeHtml(policy.title)}</h1>
    <div class="updated" id="legal-updated">Last updated: ${escapeHtml(updated)}</div>
    <div class="intro" id="legal-intro">${escapeHtml(policy.intro)}</div>
    <div id="legal-sections">
${sections}
    </div>`;
  outputs.set(path, (original.slice(0, opening) + content + original.slice(closing))
    .replace(/\n  <script src="\.\.\/legal\.js"><\/script>/g, "")
    .replace(/\n  <script>renderApexLegal\("(?:privacy|terms)"\);<\/script>/g, ""));
}
// Keep this asset for previously cached versions of the legal-page shells.
outputs.set("legal.js", `// Generated from the APEX app legal content by scripts/sync-legal.mjs.
// The public legal pages contain the complete text without requiring JavaScript.
window.APEX_LEGAL_UPDATED = ${JSON.stringify(updated)};
window.APEX_LEGAL = ${JSON.stringify(policies, null, 2)};

window.renderApexLegal = function(kind) {
  const policy = window.APEX_LEGAL[kind];
  if (!policy) return;
  document.title = policy.title + " | APEX";
  document.getElementById("legal-title").textContent = policy.title;
  document.getElementById("legal-updated").textContent = "Last updated: " + window.APEX_LEGAL_UPDATED;
  document.getElementById("legal-intro").textContent = policy.intro;
  const root = document.getElementById("legal-sections");
  root.replaceChildren();
  policy.sections.forEach((section, index) => {
    const wrapper = document.createElement("section");
    wrapper.className = "legal-section";
    const heading = document.createElement("h2");
    heading.textContent = (index + 1) + ". " + section.title;
    const body = document.createElement("p");
    body.textContent = section.body;
    wrapper.appendChild(heading);
    wrapper.appendChild(body);
    root.appendChild(wrapper);
  });
};
`);
for (const [path, content] of outputs) {
  const original = await readFile(resolve(root, path), "utf8");
  if (original === content) continue;
  if (check) throw new Error(`${path} differs from app legal content. Run this command without --check.`);
}
if (!check) {
  for (const [path, content] of outputs) await writeFile(resolve(root, path), content);
}
console.log(`${check ? "Verified" : "Generated"} matching privacy and terms content, dated ${updated}.`);
