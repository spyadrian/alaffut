import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = file => readFileSync(new URL(file, root), "utf8");
const pages = readdirSync(root).filter(file => file.endsWith(".html"));
const scripts = ["js/", "js/core/", "js/core/sources/", "js/ui/"].flatMap(dir =>
  readdirSync(new URL(dir, root)).filter(file => file.endsWith(".js")).map(file => dir + file));

test("the server sends a CSP that forbids inline scripts and styles", () => {
  const csp = read(".htaccess").match(/Content-Security-Policy "([^"]+)"/)?.[1] ?? "";
  for (const rule of ["default-src 'self'", "script-src 'self'", "style-src 'self'", "connect-src https:"]) assert.ok(csp.includes(rule), rule);
  assert.ok(!csp.includes("unsafe-inline"));
});

test("no page or script relies on inline code or styles", () => {
  assert.ok(pages.includes("index.html"));
  for (const file of [...pages, ...scripts]) {
    const text = read(file);
    assert.ok(!/<style|\sstyle=|\son[a-z]+=/i.test(text), file);
    assert.ok(!/<script(?![^>]*\ssrc=)/i.test(text), file);
  }
});
