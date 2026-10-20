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

const teamtailor = readFileSync(new URL("fixtures/teamtailor.xml", import.meta.url), "utf8");

test("rss.parse takes the location the feed gives, whatever its prefix", () => {
  const jobs = rss.parse(teamtailor, DOMParser);
  assert.equal(jobs.length, 2);
  assert.deepEqual(jobs[0], {
    id: "4ff07fd5-3ac0-4333-8f4c-955380396321",
    title: "UK Account Executive - SMB",
    location: "London, United Kingdom",
    published: "2026-07-24T07:05:16.000Z",
    url: "https://career.teamtailor.com/jobs/8118064-uk-account-executive-smb",
  });
  const two = teamtailor.replace("</tt:locations>", "<tt:location><tt:city>Zurich</tt:city><tt:country>Switzerland</tt:country></tt:location></tt:locations>");
  assert.equal(rss.parse(two, DOMParser)[0].location, "London, United Kingdom · Zurich, Switzerland");
});

test("rss.parse falls back to plain location, city, then region and country", () => {
  const item = inner => `<rss><channel><item><title>T</title><link>https://x.org/1</link>${inner}</item></channel></rss>`;
  const place = inner => rss.parse(item(inner), DOMParser)[0].location;
  assert.equal(place("<location> Remote, Europe </location>"), "Remote, Europe");
  assert.equal(place("<city>Geneva</city><country>Switzerland</country>"), "Geneva");
  assert.equal(place("<region>Anywhere in the World</region><country>Switzerland</country>"), "Anywhere in the World, Switzerland");
  assert.equal(place(""), "");
});

// A feed of jobs with these ids, and a fake getText serving pages by their paged= value.
// asked holds the URLs without the cache-busting _ stamp, stamps holds the stamps.
const feed = ids => `<rss><channel>${ids.map(i => `<item><title>Job ${i}</title><link>https://x.org/${i}</link><guid>${i}</guid></item>`).join("")}</channel></rss>`;
const range = (from, n) => Array.from({ length: n }, (_, i) => from + i);
function serve(pageAt) {
  const asked = [], stamps = [];
  const get = async url => {
    const bare = new URL(url);
    stamps.push(bare.searchParams.get("_"));
    bare.searchParams.delete("_");
    asked.push(bare.href);
    const body = pageAt(Number(new URL(url).searchParams.get("paged") ?? 1));
    if (body === 404) throw Object.assign(new Error("Not found at the source. Check the link."), { status: 404 });
    if (body instanceof Error) throw body;
    return body;
  };
  return { get, asked, stamps };
}

test("rss.read follows WordPress pages until the last one", async () => {
  const { get, asked, stamps } = serve(page => page === 1 ? cern : page === 2 ? feed([1, 2]) : 404);
  const { jobs, warning } = await rss.read("https://careers.cern/jobs/feed/", get, DOMParser);
  // a fresh stamp per check gets past stale server copies, the same on every page so they match
  assert.match(stamps[0], /^\d{13}$/);
  assert.deepEqual(new Set(stamps).size, 1);
  assert.deepEqual(asked, ["https://careers.cern/jobs/feed/", "https://careers.cern/jobs/feed/?paged=2", "https://careers.cern/jobs/feed/?paged=3"]);
  assert.equal(jobs.length, 12);
  assert.equal(warning, undefined);
});

test("rss.read stops after one more request on a feed without pages and keeps its query", async () => {
  const { get, asked } = serve(() => feed([1, 2]));
  const { jobs, warning } = await rss.read("https://x.org/feed?lang=en", get, DOMParser);
  assert.deepEqual(asked, ["https://x.org/feed?lang=en", "https://x.org/feed?lang=en&paged=2"]);
  assert.equal(jobs.length, 2);
  assert.equal(warning, undefined);
});

test("rss.read warns when the list may be incomplete", async () => {
  const failing = await rss.read("https://x.org/feed", serve(page => page === 1 ? feed([1]) : new Error("The source answered with error 500.")).get, DOMParser);
  assert.equal(failing.jobs.length, 1);
  assert.match(failing.warning, /first 1 jobs/);

  const { get, asked } = serve(page => feed(range(page * 10, 10)));
  const capped = await rss.read("https://x.org/feed", get, DOMParser);
  assert.equal(asked.length, 10);
  assert.equal(capped.jobs.length, 100);
  assert.match(capped.warning, /first 100 jobs/);

  const hundred = await rss.read("https://x.org/jobs.rss", serve(() => feed(range(1, 100))).get, DOMParser);
  assert.equal(hundred.jobs.length, 100);
  assert.match(hundred.warning, /first 100 jobs/);
});

test("rss.read reports a first page that fails", async () => {
  await assert.rejects(rss.read("https://x.org/feed", serve(() => 404).get, DOMParser), /Not found/);
  await assert.rejects(rss.read("https://x.org/page", serve(() => "<html></html>").get, DOMParser), /isn't a job feed/);
});
