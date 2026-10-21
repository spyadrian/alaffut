import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { detect } from "../js/core/detect.js";
import { welcomeHtml } from "../js/ui/welcome.js";

const read = file => JSON.parse(readFileSync(new URL(`../data/${file}`, import.meta.url)));

test("every suggestion is a followable, unblocked source", () => {
  const suggestions = read("suggestions.json"), blocklist = read("blocklist.json");
  assert.ok(suggestions.length >= 8);
  for (const { name, url } of suggestions) {
    assert.ok(name.trim(), url);
    assert.ok(!detect(url, blocklist).error, url);
  }
});

test("welcomeHtml lists the suggestions, escaped", () => {
  const html = welcomeHtml([{ name: "<b>Acme</b>", url: 'https://jobs.lever.co/acme"' }]);
  assert.ok(html.includes("&lt;b&gt;Acme&lt;/b&gt;"));
  assert.ok(html.includes('data-url="https://jobs.lever.co/acme&quot;"'));
  assert.ok(html.includes('id="welcome-url"'));
  assert.ok(!html.includes("<b>Acme"));
});
