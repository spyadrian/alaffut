import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ashby from "../js/core/sources/ashby.js";

const fixture = () => JSON.parse(readFileSync(new URL("fixtures/ashby.json", import.meta.url)));

test("ashby.url points to the public job board API", () => {
  assert.equal(ashby.url("notion"), "https://api.ashbyhq.com/posting-api/job-board/notion");
});

test("ashby.parse keeps secondary locations", () => {
  const jobs = ashby.parse(fixture());
  assert.equal(jobs.length, 4);
  assert.deepEqual(jobs[0], {
    id: "1fc309c8-da20-4ff2-84c7-8b863ece2b0a",
    title: "Software Engineer, AI Connections (Developer Platform)",
    location: "San Francisco, California · New York, New York",
    published: "2026-08-24T14:44:49.699+00:00",
    url: "https://jobs.ashbyhq.com/notion/1fc309c8-da20-4ff2-84c7-8b863ece2b0a",
  });
  assert.equal(jobs[1].location, "New York, New York");
});

test("ashby.parse never returns an unlisted job", () => {
  const data = fixture();
  data.jobs[0].isListed = false;
  delete data.jobs[1].isListed;
  const jobs = ashby.parse(data);
  assert.deepEqual(jobs.map(job => job.title), ["Business Development Representative, San Francisco", "Product Designer"]);
});

test("ashby.parse drops jobs without an https link and tolerates missing fields", () => {
  const data = fixture();
  data.jobs[0].jobUrl = "javascript:alert(1)";
  delete data.jobs[1].publishedAt;
  data.jobs[1].secondaryLocations = null;
  data.jobs[2].location = null;
  const jobs = ashby.parse(data);
  assert.equal(jobs.length, 3);
  assert.equal(jobs[0].published, "");
  assert.equal(jobs[0].location, "New York, New York");
  assert.equal(jobs[1].location, "");
});

test("ashby.parse refuses an answer that is not a job list", () => {
  assert.throws(() => ashby.parse("Not Found"), /job list/);
  assert.throws(() => ashby.parse(null), /job list/);
});
