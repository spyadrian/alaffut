import { test } from "node:test";
import assert from "node:assert/strict";
import { jobHtml, day } from "../js/ui/cards.js";

const job = { title: "Engineer", location: "Zurich", published: "2026-10-01T09:00:00-04:00", url: "https://example.com/1" };

test("day formats an ISO date as DD.MM.YYYY", () => {
  assert.equal(day("2026-10-01T09:00:00-04:00"), "01.10.2026");
  assert.equal(day(""), "");
});

test("jobHtml shows title, company, location, publication date and link", () => {
  const html = jobHtml(job, "Acme");
  for (const part of ["Engineer", "<b>Acme</b>", "Zurich", "published 01.10.2026", 'href="https://example.com/1"', ">A</div>"]) {
    assert.ok(html.includes(part), part);
  }
});

test("jobHtml neutralises hostile data", () => {
  const html = jobHtml({ ...job, title: "<img src=x onerror=alert(1)>", url: "javascript:alert(1)" }, '"><script>');
  assert.ok(!html.includes("<img"));
  assert.ok(!html.includes("<script"));
  assert.ok(!html.includes("javascript:"));
  assert.ok(html.includes("&lt;img src=x onerror=alert(1)&gt;"));
});

test("jobHtml marks New and Disappeared jobs", () => {
  assert.ok(jobHtml(job, "Acme", true).includes('<span class="badge new">New</span>'));
  assert.ok(jobHtml({ ...job, gone: "2026-10-20T12:00:00.000Z" }, "Acme", true).includes("Disappeared on 20.10.2026"));
  assert.ok(!jobHtml(job, "Acme").includes("badge"));
});
