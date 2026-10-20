import { test } from "node:test";
import assert from "node:assert/strict";
import { cities, cityKey } from "../js/core/cities.js";

test("a place is named by what comes before its first comma", () => {
  assert.deepEqual(cities("Zurich, Zurich, CHE"), ["Zurich"]);
  assert.deepEqual(cities("New York, NY"), ["New York"]);
  assert.deepEqual(cities("Remote"), ["Remote"]);
});

test("several places joined with · or ; give one name each", () => {
  assert.deepEqual(cities("Paris · Zurich, CH · Warsaw"), ["Paris", "Zurich", "Warsaw"]);
  assert.deepEqual(cities("Bangalore, India; Remote, Poland"), ["Bangalore", "Remote"]);
});

test("an empty location gives Not specified", () => {
  for (const location of ["", "  ", " · ", ", CH", undefined]) assert.deepEqual(cities(location), ["Not specified"], String(location));
});

test("cityKey ignores case, accents and extra spaces, nothing else", () => {
  assert.equal(cityKey("Zürich"), cityKey("ZURICH"));
  assert.equal(cityKey("New  York"), cityKey("new york"));
  assert.notEqual(cityKey("Genève"), cityKey("Genf"));
});
