import { test } from "node:test";
import assert from "node:assert/strict";
import { terms, matches, highlight } from "../js/core/search.js";

test("terms ignore accents, case and extra spaces", () => {
  assert.deepEqual(terms("  Zürich   ENGINEER "), ["zurich", "engineer"]);
  assert.deepEqual(terms(""), []);
});

test("every term must appear somewhere in the texts", () => {
  const texts = ["Software Engineer", "Acme", "Zürich, CH"];
  assert.ok(matches(texts, terms("zurich engineer")));
  assert.ok(matches(texts, terms("ACME soft")));
  assert.ok(!matches(texts, terms("zurich designer")));
  assert.ok(matches(texts, []));
});

test("terms do not match across two fields", () => {
  assert.ok(!matches(["Data", "Acme"], terms("aac")));
});

test("highlight marks matches, accents included", () => {
  assert.equal(highlight("Zürich, CH", terms("zurich")), "<mark>Zürich</mark>, CH");
  assert.equal(highlight("Zurich", terms("zür")), "<mark>Zur</mark>ich");
  assert.equal(highlight("Software Engineer", terms("eng soft")), "<mark>Soft</mark>ware <mark>Eng</mark>ineer");
  assert.equal(highlight("Geneva", []), "Geneva");
});

test("highlight works on text already in decomposed form", () => {
  assert.equal(highlight("Zürich", terms("zurich")), "<mark>Zürich</mark>");
});

test("highlight escapes before marking and never breaks an entity", () => {
  assert.equal(highlight("<b>R&D</b>", terms("amp")), "&lt;b&gt;R&amp;D&lt;/b&gt;");
  assert.equal(highlight("<img src=x onerror=alert(1)>", terms("img")), "&lt;<mark>img</mark> src=x onerror=alert(1)&gt;");
  assert.equal(highlight("R&D", terms("r&d")), "<mark>R&amp;D</mark>");
});
