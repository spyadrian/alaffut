import { test } from "node:test";
import assert from "node:assert/strict";
import { jobHtml, day, renderJobs } from "../js/ui/cards.js";

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

test("jobHtml shows Not specified when the location is missing", () => {
  assert.ok(jobHtml({ ...job, location: "" }, "Acme").includes("<span>Not specified</span>"));
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

test("jobHtml highlights search terms in title, company and location", () => {
  const html = jobHtml({ ...job, location: "Zürich" }, "Acme", false, ["zurich", "eng", "acm"]);
  for (const part of ["<mark>Eng</mark>ineer", "<b><mark>Acm</mark>e</b>", "<span><mark>Zürich</mark></span>"]) {
    assert.ok(html.includes(part), part);
  }
});

test("jobHtml shows first words in the title only", () => {
  const html = jobHtml({ ...job, title: "Junior Engineer", location: "Junior City" }, "Junior Ltd", false, [], ["junior"]);
  assert.ok(html.includes('<strong class="first">Junior</strong> Engineer'));
  assert.equal(html.split("first").length, 2);
});

test("jobHtml offers both marks, and shows them once set", () => {
  const plain = jobHtml({ ...job, key: "a:1" }, "Acme");
  assert.ok(plain.includes('data-key="a:1" data-mark="applied" aria-pressed="false">I applied</button>'));
  assert.ok(plain.includes('data-mark="hidden" aria-pressed="false">Not interested</button>'));
  const marked = jobHtml({ ...job, key: "a:1", applied: "2026-10-20T12:00:00.000Z", hidden: "2026-10-20T12:00:00.000Z", gone: "2026-10-21T12:00:00.000Z" }, "Acme");
  assert.ok(marked.includes('aria-pressed="true">✓ Applied on 20.10.2026</button>'));
  assert.ok(marked.includes('aria-pressed="true">Show again</button>'));
  assert.ok(marked.includes('class="job gone applied"'));
});

test("jobHtml escapes the job key in its buttons", () => {
  assert.ok(!jobHtml({ ...job, key: 'a:"><img>' }, "Acme").includes("<img>"));
});

test("renderJobs shows the first jobs and a button for the rest", async () => {
  const { parseHTML } = await import("linkedom");
  const { document } = parseHTML("<div id=list></div><button id=more hidden></button>");
  const list = document.getElementById("list"), more = document.getElementById("more");
  const jobs = Array.from({ length: 120 }, (_, i) => ({ ...job, key: `a:${i}`, company: "a", spotted: "2026-10-20T12:00:00.000Z" }));
  const state = { companies: [{ key: "a", name: "Acme" }], jobs };
  const view = { status: "all", sort: "spotted", cities: new Set(), companies: new Set(), words: [] };

  assert.equal(renderJobs(list, more, state, view), 120);  // the total, not what is shown
  assert.equal(list.querySelectorAll(".job").length, 50);
  assert.equal(more.hidden, false);
  assert.equal(more.textContent, "Show 50 more (70 left)");
  renderJobs(list, more, state, view, 100);
  assert.equal(more.textContent, "Show 20 more (20 left)");
  renderJobs(list, more, state, view, 150);
  assert.equal(list.querySelectorAll(".job").length, 120);
  assert.equal(more.hidden, true);
});
