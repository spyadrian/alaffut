import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getJson, readSource } from "../js/core/fetch.js";

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

test("readSource fetches the adapter URL and parses the answer", async () => {
  const body = readFileSync(new URL("fixtures/greenhouse.json", import.meta.url), "utf8");
  globalThis.fetch = async url => {
    assert.equal(url, "https://boards-api.greenhouse.io/v1/boards/bitpanda/jobs");
    return new Response(body);
  };
  const jobs = await readSource({ tool: "greenhouse", account: "bitpanda" });
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
