import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getJson, getText, readSource, readAll } from "../js/core/fetch.js";

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

test("readSource fetches the adapter URL and parses the answer", async () => {
  const body = readFileSync(new URL("fixtures/greenhouse.json", import.meta.url), "utf8");
  globalThis.fetch = async url => {
    assert.equal(url, "https://boards-api.greenhouse.io/v1/boards/bitpanda/jobs");
    return new Response(body);
  };
  const { jobs } = await readSource({ tool: "greenhouse", account: "bitpanda" });
  assert.equal(jobs.length, 4);
});

test("getJson turns failures into readable errors", async () => {
  const cases = [
    [async () => new Response("{}", { status: 404 }), /not found/i],
    [async () => new Response("{}", { status: 500 }), /error 500/],
    [async () => new Response("<html>"), /unreadable/],
    [async () => { throw new TypeError("Failed to fetch"); }, /couldn't be reached/],
    [async () => { throw new DOMException("timed out", "TimeoutError"); }, /in time/],
  ];
  for (const [fake, message] of cases) {
    globalThis.fetch = fake;
    await assert.rejects(getJson("https://example.com"), message);
  }
});

test("readSource reads a feed as text and explains a feed the browser blocks", async () => {
  globalThis.fetch = async url => new Response(url === "https://careers.cern/jobs/feed/" ? "<rss/>" : "");
  assert.equal(await getText("https://careers.cern/jobs/feed/"), "<rss/>");
  globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };
  await assert.rejects(readSource({ tool: "rss", account: "https://careers.cern/jobs/feed/" }), /doesn't let other websites read it/);
});

test("readAll reads 4 sources at most at once and keeps going after a failure", async () => {
  let running = 0, peak = 0;
  const read = async n => {
    peak = Math.max(peak, ++running);
    await new Promise(r => setTimeout(r, 5));
    running--;
    if (n === 2) throw new Error("down");
    return { jobs: [n] };
  };
  const results = new Map();
  await readAll([1, 2, 3, 4, 5, 6], (n, result) => results.set(n, result), read);
  assert.equal(peak, 4);
  assert.deepEqual(results.get(2), { error: "down" });
  assert.deepEqual(results.get(6), { jobs: [6] });
  assert.equal(results.size, 6);
});
