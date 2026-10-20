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

test("detect recognises Lever boards and keeps the EU region apart", () => {
  assert.deepEqual(detect("https://jobs.lever.co/Palantir/3f2a-uuid?lever-source=x"), { tool: "lever", account: "palantir" });
  assert.deepEqual(detect("https://jobs.eu.lever.co/everseen"), { tool: "lever-eu", account: "everseen" });
  assert.equal(typeof detect("https://jobs.lever.co/").error, "string");
});

test("detect recognises Ashby boards", () => {
  assert.deepEqual(detect("https://jobs.ashbyhq.com/Notion/1fc309c8-da20?utm_source=x"), { tool: "ashby", account: "notion" });
  assert.equal(typeof detect("https://jobs.ashbyhq.com/").error, "string");
});

test("detect recognises SmartRecruiters boards", () => {
  assert.deepEqual(detect("https://jobs.smartrecruiters.com/BoschGroup/744000156501729-supply-chain-intern"), { tool: "smartrecruiters", account: "boschgroup" });
  assert.deepEqual(detect("https://careers.smartrecruiters.com/LVMH"), { tool: "smartrecruiters", account: "lvmh" });
  assert.equal(typeof detect("https://careers.smartrecruiters.com/").error, "string");
});
