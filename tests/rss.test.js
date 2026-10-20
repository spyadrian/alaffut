import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DOMParser } from "linkedom";
import rss from "../js/core/sources/rss.js";

const cern = readFileSync(new URL("fixtures/cern.xml", import.meta.url), "utf8");

test("rss.parse reads an RSS 2.0 feed: title, link, date, no location", () => {
  const jobs = rss.parse(cern, DOMParser);
  assert.equal(jobs.length, 10);
  assert.deepEqual(jobs[1], {
    id: "https://careers.cern/?post_type=job_offer&p=46856",
    title: "Project Planning & Controls Analyst",
    location: "",
    published: "2026-10-06T12:09:51.000Z",
    url: "https://careers.cern/jobs/fcc-po-2026-238-grae-2/",
  });
});

test("rss.parse reads an Atom feed and its alternate link", () => {
  const atom = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Jobs</title>
    <entry><id>urn:job:1</id><title>Physicist</title><link rel="self" href="https://example.org/self"/>
      <link rel="alternate" href="https://example.org/jobs/1"/><updated>2026-10-02T08:00:00Z</updated></entry>
    <entry><title>No date</title><link href="https://example.org/jobs/2"/></entry>
    <entry><id>urn:job:3</id><title>Hostile</title><link href="javascript:alert(1)"/></entry>
  </feed>`;
  assert.deepEqual(rss.parse(atom, DOMParser), [
    { id: "urn:job:1", title: "Physicist", location: "", published: "2026-10-02T08:00:00.000Z", url: "https://example.org/jobs/1" },
    { id: "https://example.org/jobs/2", title: "No date", location: "", published: "", url: "https://example.org/jobs/2" },
  ]);
});

test("rss.parse explains that an HTML page is not a feed", () => {
  for (const text of ["<!doctype html><html><body><h1>Careers</h1></body></html>", "{}", ""]) {
    assert.throws(() => rss.parse(text, DOMParser), /isn't a job feed/);
  }
});
