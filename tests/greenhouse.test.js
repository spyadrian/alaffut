import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import greenhouse from "../js/core/sources/greenhouse.js";

const fixture = () => JSON.parse(readFileSync(new URL("fixtures/greenhouse.json", import.meta.url)));

test("greenhouse.url points to the public board API", () => {
  assert.equal(greenhouse.url("bitpanda"), "https://boards-api.greenhouse.io/v1/boards/bitpanda/jobs");
});

test("greenhouse.parse keeps only title, location, date and link", () => {
  const jobs = greenhouse.parse(fixture());
  assert.equal(jobs.length, 4);
  assert.deepEqual(jobs[0], {
    id: "4721614101",
    title: "Associate, Phone Support - DACH",
    location: "Vienna, Vienna, Austria",
    published: "2025-12-02T05:55:37-05:00",
    url: "https://job-boards.eu.greenhouse.io/bitpanda/jobs/4721614101",
  });
});

test("greenhouse.parse drops jobs without an https link and tolerates missing fields", () => {
  const data = fixture();
  data.jobs[0].absolute_url = "javascript:alert(1)";
  delete data.jobs[1].absolute_url;
  data.jobs[2].location = null;
  delete data.jobs[2].first_published;
  const jobs = greenhouse.parse(data);
  assert.equal(jobs.length, 2);
  assert.equal(jobs[0].location, "");
  assert.equal(jobs[0].published, data.jobs[2].updated_at);
});

test("greenhouse.parse refuses an answer that is not a job list", () => {
  assert.throws(() => greenhouse.parse({ status: 404 }), /job list/);
  assert.throws(() => greenhouse.parse(null), /job list/);
});
