import { test } from "node:test";
import assert from "node:assert/strict";
import { load, save, addCompany, KEY } from "../js/core/store.js";

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
  assert.deepEqual(again.companies, [{ key: "greenhouse:acme", tool: "greenhouse", account: "acme", name: "Acme", added: "2026-10-20T10:00:00.000Z" }]);
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
