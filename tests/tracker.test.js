import { test } from "node:test";
import assert from "node:assert/strict";
import { addCompany } from "../js/core/store.js";
import { startVisit, merge, due, isNew, figures } from "../js/core/tracker.js";

const T0 = "2026-10-20T10:00:00.000Z", T1 = "2026-10-20T12:00:00.000Z", T2 = "2026-10-21T08:00:00.000Z";
const job = id => ({ id, title: `Job ${id}`, location: "Zurich", published: "2026-10-01", url: `https://example.com/${id}` });
const acme = { tool: "greenhouse", account: "acme" };
const empty = { version: 1, companies: [], jobs: [] };
const start = () => addCompany(startVisit(empty, T0), acme, "Acme", [job("1"), job("2")], T0);
const byId = (state, id) => state.jobs.find(j => j.id === id);

test("a job missing from a successful answer disappears on that date", () => {
  const state = merge(start(), "greenhouse:acme", { jobs: [job("1")] }, T1);
  assert.equal(byId(state, "2").gone, T1);
  assert.equal(byId(state, "1").gone, undefined);
});

test("a source in error makes no job disappear and records the cause", () => {
  const state = merge(start(), "greenhouse:acme", { error: "The source couldn't be reached." }, T1);
  assert.ok(state.jobs.every(j => !j.gone));
  assert.equal(state.companies[0].error, "The source couldn't be reached.");
  assert.equal(state.companies[0].checked, T0);
  assert.equal(figures(state).errors, 1);
});

test("a job that reappears is open again, and a success clears the error", () => {
  let state = merge(start(), "greenhouse:acme", { jobs: [job("1")] }, T1);
  state = merge(state, "greenhouse:acme", { error: "x" }, T1);
  state = merge(state, "greenhouse:acme", { jobs: [job("1"), job("2")] }, T2);
  assert.equal(byId(state, "2").gone, undefined);
  assert.equal(byId(state, "2").spotted, T0);
  assert.equal(state.companies[0].error, null);
});

test("jobs of the first check are not New; jobs found later in the visit are", () => {
  const state = merge(start(), "greenhouse:acme", { jobs: [job("1"), job("2"), job("3")] }, T1);
  assert.deepEqual(state.jobs.filter(j => isNew(state, j)).map(j => j.id), ["3"]);
  assert.equal(figures(state).new, 1);
});

test("a visit lasts until an hour without opening the site", () => {
  const state = merge(start(), "greenhouse:acme", { jobs: [job("1"), job("2"), job("3")] }, T1);
  const soon = startVisit(state, "2026-10-20T12:30:00.000Z");
  assert.equal(soon.visit.since, T0);
  assert.equal(soon.jobs.filter(j => isNew(soon, j)).length, 1);
  const later = startVisit(soon, "2026-10-20T13:31:00.000Z");
  assert.equal(later.visit.since, "2026-10-20T13:31:00.000Z");
  assert.equal(later.jobs.filter(j => isNew(later, j)).length, 0);
});

test("a gone job is not New and does not count as open", () => {
  const state = merge(start(), "greenhouse:acme", { jobs: [job("3")] }, T1);
  assert.deepEqual(figures(state), { open: 1, new: 1, applied: 0, errors: 0 });
});

test("due: checked over 15 min ago, or forced; never twice within 2 min", () => {
  const c = { checked: T0, tried: T0 };
  const at = minutes => new Date(Date.parse(T0) + minutes * 60e3).toISOString();
  assert.equal(due(c, at(10)), false);
  assert.equal(due(c, at(16)), true);
  assert.equal(due(c, at(1), true), false);
  assert.equal(due(c, at(3), true), true);
  assert.equal(due({ checked: T0, tried: at(15) }, at(16)), false);
});
