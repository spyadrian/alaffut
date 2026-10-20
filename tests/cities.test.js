import { test } from "node:test";
import assert from "node:assert/strict";
import { cities } from "../js/core/cities.js";

test("variants of a city come back as one English name", () => {
  for (const location of ["Zurich, Zurich, CHE", "Zuerich", "Zürich, CH", "ZURICH"]) assert.deepEqual(cities(location), ["Zurich"], location);
  for (const location of ["Genève", "Geneva, Switzerland", "Genf", "Ginevra"]) assert.deepEqual(cities(location), ["Geneva"], location);
  assert.deepEqual(cities("Bâle"), ["Basel"]);
  assert.deepEqual(cities("Berne, CH"), ["Bern"]);
  assert.deepEqual(cities("Zoug"), ["Zug"]);
  assert.deepEqual(cities("Luzern"), ["Lucerne"]);
  assert.deepEqual(cities("München"), ["Munich"]);
  assert.deepEqual(cities("København"), ["Copenhagen"]);
  assert.deepEqual(cities("Wrocław, Poland"), ["Wroclaw"]);
});

test("a location naming several cities gives each, once, in order", () => {
  assert.deepEqual(cities("Paris · Zurich · Warsaw"), ["Paris", "Zurich", "Warsaw"]);
  assert.deepEqual(cities("Zurich; Zürich; Basel"), ["Zurich", "Basel"]);
});

test("multi-word cities and region prefixes are recognised", () => {
  assert.deepEqual(cities("New York, New York"), ["New York"]);
  assert.deepEqual(cities("US-CA-San Francisco"), ["San Francisco"]);
  assert.deepEqual(cities("St. Gallen"), ["St. Gallen"]);
});

test("only whole words count", () => {
  assert.deepEqual(cities("Zugspitze"), ["Not specified"]);
  assert.deepEqual(cities("Bernese Oberland"), ["Not specified"]);
});

test("nothing recognised gives Not specified", () => {
  for (const location of ["Remote", "", undefined, "Atlantis"]) assert.deepEqual(cities(location), ["Not specified"]);
});
