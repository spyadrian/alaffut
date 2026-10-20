import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { lever, leverEu } from "../js/core/sources/lever.js";

const fixture = () => JSON.parse(readFileSync(new URL("fixtures/lever.json", import.meta.url)));

test("lever.url points to the US or EU postings API", () => {
  assert.equal(lever.url("palantir"), "https://api.lever.co/v0/postings/palantir?mode=json");
  assert.equal(leverEu.url("everseen"), "https://api.eu.lever.co/v0/postings/everseen?mode=json");
});

test("lever.parse keeps every location and converts createdAt", () => {
  const jobs = leverEu.parse(fixture());
  assert.equal(jobs.length, 4);
  assert.deepEqual(jobs[0], {
    id: "499b4746-27b3-4c13-8cd8-cc5dccdbad9c",
    title: "DevOps Manager",
    location: "Cork · Timișoara",
    published: new Date(1791277894813).toISOString(),
    url: "https://jobs.eu.lever.co/everseen/499b4746-27b3-4c13-8cd8-cc5dccdbad9c",
  });
  assert.equal(jobs[1].location, "Pune");
});

test("lever.parse drops jobs without an https link and tolerates missing fields", () => {
  const data = fixture();
  data[0].hostedUrl = "javascript:alert(1)";
  delete data[1].hostedUrl;
  delete data[2].categories.allLocations;
  delete data[2].createdAt;
  data[3].categories = null;
  const jobs = lever.parse(data);
  assert.equal(jobs.length, 2);
  assert.equal(jobs[0].location, "Pune");
  assert.equal(jobs[0].published, "");
  assert.equal(jobs[1].location, "");
});

test("lever.parse refuses an answer that is not a job list", () => {
  assert.throws(() => lever.parse({ ok: false, error: "Document not found" }), /job list/);
  assert.throws(() => lever.parse(null), /job list/);
});
