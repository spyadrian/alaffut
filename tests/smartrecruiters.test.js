import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import smartrecruiters from "../js/core/sources/smartrecruiters.js";

const page = n => JSON.parse(readFileSync(new URL(`fixtures/smartrecruiters-${n}.json`, import.meta.url)));

// A fake getJson that serves pages by offset and remembers what was asked.
function serve(pageAt) {
  const asked = [];
  const get = async url => {
    asked.push(url);
    return pageAt(Number(new URL(url).searchParams.get("offset")));
  };
  return { get, asked };
}

test("smartrecruiters.read follows pages until the total and rebuilds https links", async () => {
  const pages = { 0: page(1), 2: page(2) };
  const { get, asked } = serve(offset => pages[offset]);
  const { jobs, warning } = await smartrecruiters.read("lvmh", get);
  assert.deepEqual(asked, [
    "https://api.smartrecruiters.com/v1/companies/lvmh/postings?limit=100&offset=0",
    "https://api.smartrecruiters.com/v1/companies/lvmh/postings?limit=100&offset=2",
  ]);
  assert.equal(warning, undefined);
  assert.equal(jobs.length, 4);
  assert.deepEqual(jobs[0], {
    id: "91042746",
    title: "INTEGRATEUR HTML",
    location: "Paris, Île-de-France, France",
    published: "2016-03-31T13:27:01.000Z",
    url: "https://jobs.smartrecruiters.com/LVMH/91042746",
  });
});

test("smartrecruiters.read stops at 10 pages of 100 and warns", async () => {
  const { get, asked } = serve(offset => ({
    offset, limit: 100, totalFound: 4999,
    content: Array.from({ length: 100 }, (_, i) => ({ ...page(1).content[0], id: String(offset + i) })),
  }));
  const { jobs, warning } = await smartrecruiters.read("boschgroup", get);
  assert.equal(asked.length, 10);
  assert.equal(jobs.length, 1000);
  assert.match(warning, /first 1000 of its 4999 jobs/);
});

test("smartrecruiters.read handles an empty board and missing fields", async () => {
  assert.deepEqual(await smartrecruiters.read("nobody", async () => ({ offset: 0, limit: 100, totalFound: 0, content: [] })), { jobs: [] });
  const data = page(1);
  data.totalFound = 2;
  delete data.content[0].location.fullLocation;
  delete data.content[1].releasedDate;
  const { jobs } = await smartrecruiters.read("lvmh", async () => data);
  assert.equal(jobs[0].location, "Paris, fr");
  assert.equal(jobs[1].published, "");
});

test("smartrecruiters.read refuses an answer that is not a job list", async () => {
  await assert.rejects(smartrecruiters.read("x", async () => "Not Found"), /job list/);
});
