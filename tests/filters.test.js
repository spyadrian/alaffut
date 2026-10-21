import { test } from "node:test";
import assert from "node:assert/strict";
import { STATUSES, inStatus, counts, visible, choices, prune } from "../js/core/filters.js";

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
    { key: "1", company: "b", title: "analyst", location: "Zurich, CH", spotted: T0, published: "2026-09-01" },
    { key: "2", company: "a", title: "Zeta", location: "Paris · Genève", spotted: T1, published: "2026-08-01" },
    { key: "3", company: "a", title: "Mu", location: "", spotted: T0, published: "2026-10-01" },
    { key: "4", company: "b", title: "Gone", location: "Zürich", spotted: T0, published: "2026-10-02", gone: T1 },
    { key: "5", company: "b", title: "Gone too", location: "ZURICH · zurich", spotted: T0, published: "2026-10-03", gone: T1 },
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
  assert.deepEqual(shown({ cities: new Set(["geneve"]) }), ["2"]);
  assert.deepEqual(shown({ cities: new Set(["zurich", "not specified"]) }), ["3", "1"]);
  assert.deepEqual(shown({ status: "all", cities: new Set(["zurich"]) }), ["5", "4", "1"]);
  assert.deepEqual(shown({ companies: new Set(["b"]) }), ["1"]);
  assert.deepEqual(shown({ companies: new Set(["a"]), cities: new Set(["paris"]), words: ["alp"] }), ["2"]);
});

test("choices lists every city (A → Z, Not specified last) and company with its count in the current status", () => {
  const { cities, companies } = choices(listing, view());
  assert.deepEqual(cities, [
    { value: "geneve", label: "Genève", count: 1 },
    { value: "paris", label: "Paris", count: 1 },
    { value: "zurich", label: "Zurich", count: 1 },
    { value: "not specified", label: "Not specified", count: 1 },
  ]);
  assert.deepEqual(companies, [{ value: "a", label: "Alpha", count: 2 }, { value: "b", label: "beta", count: 1 }]);
  assert.deepEqual(choices(listing, view({ status: "gone" })).cities.map(c => c.count), [0, 0, 2, 0]);
});

test("each list counts with the other filters and the search, but not its own ticks", () => {
  const ticked = choices(listing, view({ companies: new Set(["b"]), cities: new Set(["paris"]) }));
  assert.deepEqual(ticked.cities.map(c => c.count), [0, 0, 1, 0]);  // Bolt's jobs only, whatever the city ticks
  assert.deepEqual(ticked.companies.map(c => c.count), [1, 0]);  // Paris jobs only, whatever the company ticks
  assert.deepEqual(choices(listing, view({ words: ["mu"] })).companies.map(c => c.count), [1, 0]);
});

test("choices counts a job once per city and shows its most frequent spelling", () => {
  const zurich = state => choices(state, view({ status: "all" })).cities.find(c => c.value === "zurich");
  assert.deepEqual(zurich(listing), { value: "zurich", label: "Zurich", count: 3 });
  const more = { ...listing, jobs: [...listing.jobs, { key: "6", company: "a", title: "X", location: "Zürich", spotted: T0, published: "" }, { key: "7", company: "a", title: "Y", location: "Zürich", spotted: T0, published: "" }] };
  assert.equal(zurich(more).label, "Zürich");
});

test("search, status, city, company and sort combine", () => {
  const all = { status: "all", words: ["gone"], cities: new Set(["zurich"]), companies: new Set(["b"]) };
  assert.deepEqual(shown(all), ["5", "4"]);
  assert.deepEqual(shown({ ...all, sort: "title" }), ["4", "5"]);
  assert.deepEqual(shown({ ...all, status: "open" }), []);
  assert.deepEqual(shown({ ...all, companies: new Set(["a"]) }), []);
  assert.deepEqual(shown({ ...all, words: ["gone", "too"] }), ["5"]);
});

test("prune drops ticked cities and companies that no longer exist, and keeps the others", () => {
  const ticked = view({ cities: new Set(["zurich", "lyon"]), companies: new Set(["a", "gone"]) });
  prune(listing, ticked);
  assert.deepEqual([...ticked.cities], ["zurich"]);
  assert.deepEqual([...ticked.companies], ["a"]);
});
