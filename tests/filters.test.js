import { test } from "node:test";
import assert from "node:assert/strict";
import { STATUSES, inStatus, counts } from "../js/core/filters.js";

const T0 = "2026-10-20T10:00:00.000Z", T1 = "2026-10-20T12:00:00.000Z";
const state = {
  visit: { since: T0 },
  companies: [{ key: "a", added: T0 }],
  jobs: [
    { key: "open", company: "a", spotted: T0 },
    { key: "new", company: "a", spotted: T1 },
    { key: "applied", company: "a", spotted: T0, applied: T1 },
    { key: "gone", company: "a", spotted: T0, gone: T1 },
    { key: "hidden-new", company: "a", spotted: T1, hidden: T1 },
    { key: "hidden-applied", company: "a", spotted: T0, applied: T1, hidden: T1 },
  ],
};
const keys = status => state.jobs.filter(job => inStatus(state, status, job)).map(job => job.key);

test("each status keeps its jobs; Not interested ones only appear in Not interested", () => {
  assert.deepEqual(keys("open"), ["open", "new", "applied"]);
  assert.deepEqual(keys("new"), ["new"]);
  assert.deepEqual(keys("applied"), ["applied"]);
  assert.deepEqual(keys("gone"), ["gone"]);
  assert.deepEqual(keys("all"), ["open", "new", "applied", "gone"]);
  assert.deepEqual(keys("hidden"), ["hidden-new", "hidden-applied"]);
});

test("counts gives the number of jobs per status", () => {
  assert.deepEqual(counts(state), { open: 3, new: 1, applied: 1, gone: 1, all: 4, hidden: 2 });
  assert.deepEqual(Object.keys(STATUSES), Object.keys(counts(state)));
});
