import { test } from "node:test";
import assert from "node:assert/strict";
import { rulesHtml } from "../js/ui/rules.js";

test("rulesHtml names each rule in words, not only by colour, and escapes the word", () => {
  const html = rulesHtml([{ word: '<img src=x>"', kind: "exclude" }, { word: "junior", kind: "prioritise" }, { word: "engineer", kind: "require" }]);
  assert.ok(html.includes('data-word="&lt;img src=x&gt;&quot;"'));
  assert.ok(!html.includes("<img"));
  assert.ok(html.includes('<li class="rule exclude">'));
  assert.ok(html.includes("junior<small>first</small>"));
  assert.ok(html.includes("engineer<small>must have</small>"));
  assert.ok(html.includes('aria-label="Remove junior"'));
});
