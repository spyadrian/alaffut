import { test } from "node:test";
import assert from "node:assert/strict";
import { STATUSES, inStatus, counts, visible, choices } from "../js/core/filters.js";

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

const listing = {
  visit: { since: T0 },
  companies: [{ key: "b", name: "beta", added: T0 }, { key: "a", name: "Alpha", added: T0 }],
  jobs: [
    { key: "1", company: "b", title: "analyst", location: "Zurich", spotted: T0, published: "2026-09-01" },
    { key: "2", company: "a", title: "Zeta", location: "Paris · Geneva", spotted: T1, published: "2026-08-01" },
    { key: "3", company: "a", title: "Mu", location: "Remote", spotted: T0, published: "2026-10-01" },
    { key: "4", company: "b", title: "Gone", location: "Zürich", spotted: T0, published: "2026-10-02", gone: T1 },
  ],
};
const view = extra => ({ status: "open", sort: "spotted", words: [], cities: new Set(), companies: new Set(), ...extra });
const shown = extra => visible(listing, view(extra)).map(job => job.key);

test("visible sorts by each order", () => {
  assert.deepEqual(shown(), ["2", "3", "1"]);
  assert.deepEqual(shown({ sort: "published" }), ["3", "1", "2"]);
  assert.deepEqual(shown({ sort: "company" }), ["3", "2", "1"]);
  assert.deepEqual(shown({ sort: "title" }), ["1", "3", "2"]);
});

test("visible combines status, cities, companies and search", () => {
  assert.deepEqual(shown({ cities: new Set(["Geneva"]) }), ["2"]);
  assert.deepEqual(shown({ cities: new Set(["Zurich", "Not specified"]) }), ["3", "1"]);
  assert.deepEqual(shown({ status: "all", cities: new Set(["Zurich"]) }), ["4", "1"]);
  assert.deepEqual(shown({ companies: new Set(["b"]) }), ["1"]);
  assert.deepEqual(shown({ companies: new Set(["a"]), cities: new Set(["Paris"]), words: ["alp"] }), ["2"]);
});

test("choices lists every city and company with its count in the current status", () => {
  const { cities, companies } = choices(listing, "open");
  assert.deepEqual(cities, [
    { value: "Geneva", label: "Geneva", count: 1 },
    { value: "Not specified", label: "Not specified", count: 1 },
    { value: "Paris", label: "Paris", count: 1 },
    { value: "Zurich", label: "Zurich", count: 1 },
  ]);
  assert.deepEqual(companies, [{ value: "a", label: "Alpha", count: 2 }, { value: "b", label: "beta", count: 1 }]);
  assert.deepEqual(choices(listing, "gone").cities.map(c => c.count), [1, 0, 0, 0]);
});
