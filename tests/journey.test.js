// Checkpoint 4: a new visitor's path through the core, from a suggestion to a backup read in another browser.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { detect } from "../js/core/detect.js";
import greenhouse from "../js/core/sources/greenhouse.js";
import { load, save, addCompany, toggleMark, backup, restore } from "../js/core/store.js";
import { counts } from "../js/core/filters.js";

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url)));
const memory = () => {
  const data = new Map();
  return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)) };
};

test("suggestion → jobs → mark → export → import elsewhere keeps everything", () => {
  const here = memory(), elsewhere = memory();
  const suggestion = read("../data/suggestions.json").find(s => detect(s.url).tool === "greenhouse");
  const source = detect(suggestion.url, read("../data/blocklist.json"));
  const jobs = greenhouse.parse(read("fixtures/greenhouse.json"));

  let state = addCompany(load(here), source, suggestion.name, jobs, "2026-10-21T08:00:00.000Z");
  state = toggleMark(state, state.jobs[0].key, "applied", "2026-10-21T08:05:00.000Z");
  state = toggleMark(state, state.jobs[1].key, "hidden", "2026-10-21T08:06:00.000Z");
  save(here, state);
  assert.deepEqual(load(here), state);
  assert.equal(counts(state).applied, 1);
  assert.equal(counts(state).hidden, 1);

  const file = backup(load(here), "2026-10-21T09:00:00.000Z");
  const imported = restore(load(elsewhere), file);
  save(elsewhere, imported);
  assert.deepEqual(load(elsewhere), state);
  assert.equal(load(elsewhere).companies[0].name, suggestion.name);
  assert.deepEqual(counts(load(elsewhere)), counts(state));
});
