import { test } from "node:test";
import assert from "node:assert/strict";
import { load, save, addCompany, renameCompany, removeCompany, toggleMark, backup, restore, KEY } from "../js/core/store.js";

const memory = () => {
  const data = new Map();
  return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), data };
};
const job = { id: "1", title: "Engineer", location: "Zurich", published: "2026-10-01T00:00:00Z", url: "https://example.com/1" };

test("load starts empty", () => {
  assert.deepEqual(load(memory()), { version: 1, companies: [], jobs: [] });
});

test("addCompany then save and load keeps the company and its jobs", () => {
  const storage = memory();
  const state = addCompany(load(storage), { tool: "greenhouse", account: "acme" }, " Acme ", [job], "2026-10-20T10:00:00.000Z");
  save(storage, state);
  const again = load(storage);
  assert.deepEqual(again.companies, [{ key: "greenhouse:acme", tool: "greenhouse", account: "acme", name: "Acme", added: "2026-10-20T10:00:00.000Z", checked: "2026-10-20T10:00:00.000Z", tried: "2026-10-20T10:00:00.000Z", error: null }]);
  assert.deepEqual(again.jobs, [{ ...job, key: "greenhouse:acme:1", company: "greenhouse:acme", spotted: "2026-10-20T10:00:00.000Z" }]);
});

test("addCompany refuses a company already followed", () => {
  const state = addCompany(load(memory()), { tool: "greenhouse", account: "acme" }, "Acme", [], "2026-10-20T10:00:00.000Z");
  assert.throws(() => addCompany(state, { tool: "greenhouse", account: "acme" }, "Other", [], "x"), /already follow/);
});

test("addCompany falls back to the account as the name", () => {
  const state = addCompany(load(memory()), { tool: "greenhouse", account: "acme" }, "  ", [], "x");
  assert.equal(state.companies[0].name, "acme");
});

test("load keeps an unreadable saved state aside instead of losing it", () => {
  const storage = memory();
  storage.setItem(KEY, "{broken");
  assert.deepEqual(load(storage).companies, []);
  assert.equal(storage.getItem(KEY + ":unreadable"), "{broken");
});

test("toggleMark sets a mark with its date, and a second call removes it", () => {
  const state = addCompany(load(memory()), { tool: "greenhouse", account: "acme" }, "Acme", [job], "x");
  const marked = toggleMark(state, "greenhouse:acme:1", "applied", "2026-10-21T08:00:00.000Z");
  assert.equal(marked.jobs[0].applied, "2026-10-21T08:00:00.000Z");
  assert.equal(state.jobs[0].applied, undefined);
  assert.ok(!("applied" in toggleMark(marked, "greenhouse:acme:1", "applied", "y").jobs[0]));
});

test("toggleMark only accepts the known marks", () => {
  assert.throws(() => toggleMark({ jobs: [] }, "k", "__proto__", "x"));
});

test("renameCompany trims the new name and keeps the old one when it is empty", () => {
  const state = addCompany(load(memory()), { tool: "greenhouse", account: "acme" }, "Acme", [job], "x");
  assert.equal(renameCompany(state, "greenhouse:acme", "  Acme Corp ").companies[0].name, "Acme Corp");
  assert.equal(renameCompany(state, "greenhouse:acme", "   ").companies[0].name, "Acme");
});

test("removeCompany drops the company and its jobs only", () => {
  let state = addCompany(load(memory()), { tool: "greenhouse", account: "acme" }, "Acme", [job], "x");
  state = addCompany(state, { tool: "lever", account: "bolt" }, "Bolt", [job], "x");
  state = removeCompany(state, "greenhouse:acme");
  assert.deepEqual(state.companies.map(c => c.key), ["lever:bolt"]);
  assert.deepEqual(state.jobs.map(j => j.key), ["lever:bolt:1"]);
});

const followed = () => {
  let state = addCompany(load(memory()), { tool: "greenhouse", account: "acme" }, "Acme", [job], "2026-10-20T10:00:00.000Z");
  state = addCompany(state, { tool: "rss", account: "https://example.com/jobs.xml" }, "Feed", [], "2026-10-20T10:00:00.000Z");
  return { ...toggleMark(state, "greenhouse:acme:1", "applied", "2026-10-21T08:00:00.000Z"), visit: { since: "a", seen: "b" } };
};
const file = changes => JSON.stringify({ ...JSON.parse(backup(followed(), "2026-10-21T09:00:00.000Z")), ...changes });

test("backup is a dated, versioned file with companies, jobs and marks", () => {
  const data = JSON.parse(backup(followed(), "2026-10-21T09:00:00.000Z"));
  assert.equal(data.app, "alaffut");
  assert.equal(data.version, 1);
  assert.equal(data.exported, "2026-10-21T09:00:00.000Z");
  assert.deepEqual(data.companies, followed().companies);
  assert.equal(data.jobs[0].applied, "2026-10-21T08:00:00.000Z");
  assert.equal(data.visit, undefined);
});

test("restore after an emptied browser gives back the same companies, jobs and marks", () => {
  const fresh = { ...load(memory()), visit: { since: "c", seen: "d" } };
  const back = restore(fresh, backup(followed(), "x"));
  assert.deepEqual(back, { ...followed(), visit: fresh.visit });
});

test("restore refuses what isn't a backup", () => {
  for (const text of ["{broken", "null", "[]", JSON.stringify({ version: 1, companies: [], jobs: [] })])
    assert.throws(() => restore(load(memory()), text), /isn't a backup/);
});

test("restore refuses another version", () => {
  assert.throws(() => restore(load(memory()), file({ version: 2 })), /version/);
});

test("restore refuses damaged or hostile content", () => {
  const [acme, feed] = followed().companies, [one] = followed().jobs;
  const bad = [
    { companies: "nope" },
    { jobs: [{ ...one, url: "javascript:alert(1)" }] },
    { jobs: [{ ...one, url: "http://example.com/1" }] },
    { jobs: [{ ...one, title: 3 }] },
    { jobs: [{ ...one, applied: {} }] },
    { jobs: [{ ...one, company: "greenhouse:other", key: "greenhouse:other:1" }] },
    { jobs: [one, one] },
    { companies: [{ ...acme, tool: "workday", key: "workday:acme" }, feed] },
    { companies: [{ ...acme, account: "../x", key: "greenhouse:../x" }, feed] },
    { companies: [{ ...acme, key: "greenhouse:other" }, feed] },
    { companies: [acme, { ...feed, account: "http://example.com/jobs.xml", key: "rss:http://example.com/jobs.xml" }] },
    { companies: [{ ...acme, name: "  " }, feed] },
    { companies: [acme, acme, feed] },
  ];
  for (const changes of bad) assert.throws(() => restore(load(memory()), file(changes)), /damaged/, JSON.stringify(changes));
});

test("restore keeps only the fields it knows", () => {
  const [acme, feed] = followed().companies, [one] = followed().jobs;
  const text = file({ companies: [{ ...acme, extra: "<script>" }, feed], jobs: [JSON.parse(JSON.stringify(one).replace("{", '{"__proto__":{"polluted":1},'))] });
  const back = restore(load(memory()), text);
  assert.equal(back.companies[0].extra, undefined);
  assert.equal(Object.getPrototypeOf(back.jobs[0]), Object.prototype);
  assert.equal({}.polluted, undefined);
});
