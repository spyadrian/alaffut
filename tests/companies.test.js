import { test } from "node:test";
import assert from "node:assert/strict";
import { companyHtml } from "../js/ui/companies.js";

const company = { key: "greenhouse:acme", tool: "greenhouse", account: "acme", name: 'Acme "<b>"', checked: "2026-10-20T10:00:00.000Z", error: null };
const jobs = [{ company: "greenhouse:acme" }, { company: "greenhouse:acme", gone: "x" }, { company: "lever:bolt" }];

test("companyHtml shows the name (escaped), the tool, its open jobs and the last check", () => {
  const html = companyHtml(company, jobs);
  for (const part of ['value="Acme &quot;&lt;b&gt;&quot;"', "Greenhouse", "1 open job<", "Checked 20.10.2026", 'data-key="greenhouse:acme"']) {
    assert.ok(html.includes(part), part);
  }
  assert.ok(!html.includes("<b>\""));
});

test("companyHtml shows an error or a warning instead of the check date", () => {
  assert.ok(companyHtml({ ...company, error: "No answer <now>" }, jobs).includes('<span class="red">No answer &lt;now&gt;</span>'));
  assert.ok(companyHtml({ ...company, warning: "Capped" }, jobs).includes('<span class="amber">Capped</span>'));
});
