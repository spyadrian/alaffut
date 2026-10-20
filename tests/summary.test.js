import { test } from "node:test";
import assert from "node:assert/strict";
import { summaryHtml } from "../js/ui/summary.js";

test("summaryHtml lists each source in error with its cause, escaped", () => {
  const state = {
    companies: [{ key: "a", name: "<b>Acme</b>", error: "Not found at the source. Check the link." }, { key: "b", name: "Fine", error: null }],
    jobs: [{ company: "b", spotted: "x" }],
  };
  const html = summaryHtml(state);
  assert.ok(html.banners.includes("Needs attention"));
  assert.ok(html.banners.includes("<b>&lt;b&gt;Acme&lt;/b&gt;</b>: Not found at the source."));
  assert.ok(!html.banners.includes("Fine"));
  assert.ok(html.figures.includes('<b class="red">1</b><span>sources with errors</span>'));
  assert.ok(html.figures.includes("<b>1</b><span>open jobs</span>"));
});

test("summaryHtml shows no banner when every source answered", () => {
  assert.equal(summaryHtml({ companies: [{ key: "a", name: "A", error: null }], jobs: [] }).banners, "");
});
