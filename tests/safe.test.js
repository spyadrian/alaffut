import { test } from "node:test";
import assert from "node:assert/strict";
import { esc, safeUrl } from "../js/core/safe.js";

test("esc neutralises HTML special characters", () => {
  assert.equal(esc(`<img src=x onerror="alert('1')">&`), "&lt;img src=x onerror=&quot;alert(&#39;1&#39;)&quot;&gt;&amp;");
});

test("esc turns missing values into an empty string", () => {
  assert.equal(esc(undefined), "");
  assert.equal(esc(null), "");
});

test("esc converts non-string values to text", () => {
  assert.equal(esc(42), "42");
});

test("safeUrl keeps https links, normalised", () => {
  assert.equal(safeUrl("https://boards.greenhouse.io/acme/jobs/1"), "https://boards.greenhouse.io/acme/jobs/1");
  assert.equal(safeUrl("  HTTPS://Example.com/a b "), "https://example.com/a%20b");
});

test("safeUrl rejects every other scheme", () => {
  for (const url of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "http://example.com", "data:text/html,<b>x</b>", "ftp://example.com", "//example.com"]) {
    assert.equal(safeUrl(url), null, url);
  }
});

test("safeUrl rejects invalid or missing values", () => {
  for (const url of ["", "not a url", undefined, null, 42]) {
    assert.equal(safeUrl(url), null, String(url));
  }
});
