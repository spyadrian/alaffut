import { test } from "node:test";
import assert from "node:assert/strict";
import { detect } from "../js/core/detect.js";

test("detect recognises the three Greenhouse board hosts", () => {
  for (const url of [
    "https://boards.greenhouse.io/figma",
    "https://job-boards.greenhouse.io/airtable/jobs/8403107002",
    "https://job-boards.eu.greenhouse.io/bitpanda/jobs/4721614101?gh_src=abc",
  ]) {
    const { tool, account } = detect(url);
    assert.equal(tool, "greenhouse", url);
    assert.match(account, /^(figma|airtable|bitpanda)$/, url);
  }
});

test("detect lower-cases the account and tolerates spaces and http", () => {
  assert.deepEqual(detect("  http://boards.greenhouse.io/Figma/ "), { tool: "greenhouse", account: "figma" });
});

test("detect reads the account of an embedded board", () => {
  assert.deepEqual(detect("https://boards.greenhouse.io/embed/job_board?for=acme"), { tool: "greenhouse", account: "acme" });
});

test("detect gives a readable refusal otherwise", () => {
  for (const url of ["", "not a link", "javascript:alert(1)", "https://example.com/careers",
                     "https://boards.greenhouse.io/", "https://boards.greenhouse.io/embed/job_board",
                     "https://evilgreenhouse.io/acme", "https://boards.greenhouse.io/a%22b"]) {
    const result = detect(url);
    assert.equal(typeof result.error, "string", url);
    assert.ok(result.error.length > 10, url);
    assert.equal(result.tool, undefined, url);
  }
});
