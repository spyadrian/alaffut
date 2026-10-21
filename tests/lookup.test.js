import { test } from "node:test";
import assert from "node:assert/strict";
import { isName, guesses, lookup } from "../js/core/lookup.js";

test("isName: anything without a slash is a name", () => {
  assert.ok(isName("Back Market"));
  assert.ok(isName("Booking.com"));
  assert.ok(!isName("https://jobs.lever.co/acme"));
  assert.ok(!isName("jobs.lever.co/acme"));
});

test("guesses: lowercase, no accents or apostrophes, joined and hyphenated", () => {
  assert.deepEqual(guesses("Back Market"), ["backmarket", "back-market"]);
  assert.deepEqual(guesses(" L'Oréal "), ["loreal"]);
  assert.deepEqual(guesses("Nestlé"), ["nestle"]);
  assert.deepEqual(guesses("Booking.com"), ["bookingcom", "booking-com"]);
  assert.deepEqual(guesses("!!"), []);
});

test("lookup keeps sources with jobs, skips failures and followed or blocked ones, most jobs first", async () => {
  const jobs = n => Array.from({ length: n }, (_, i) => ({ id: String(i) }));
  const answers = {
    "greenhouse:acme": { jobs: jobs(2) },
    "ashby:acme": { jobs: jobs(5), warning: "w" },
    "smartrecruiters:acme": { jobs: [] },  // unknown companies answer 200 with nothing
    "lever:acme": { jobs: jobs(9) },        // already followed
    "rss:https://acme.teamtailor.com/jobs.rss": { jobs: jobs(1) },
  };
  const read = async ({ tool, account }) => {
    const answer = answers[`${tool}:${account}`];
    if (!answer) throw new Error("Not found");
    return answer;
  };
  const found = await lookup("Acme", ["lever:acme"], read);
  assert.deepEqual(found.map(f => `${f.source.tool}:${f.jobs.length}`), ["ashby:5", "greenhouse:2", "rss:1"]);
  assert.equal(found[0].warning, "w");
  assert.equal(found[0].source.page, "https://jobs.ashbyhq.com/acme");
  assert.equal(found[2].source.page, "https://acme.teamtailor.com/jobs");
});
