// A pasted link → which tool hosts the board and under which account, or a reason why not.

const HOSTS = {
  "boards.greenhouse.io": "greenhouse",
  "job-boards.greenhouse.io": "greenhouse",
  "job-boards.eu.greenhouse.io": "greenhouse",
  "jobs.lever.co": "lever",
  // EU accounts only answer on the EU API, so the region is part of the tool
  "jobs.eu.lever.co": "lever-eu",
  "jobs.ashbyhq.com": "ashby",
  "jobs.smartrecruiters.com": "smartrecruiters",
  "careers.smartrecruiters.com": "smartrecruiters",
};
const NAMES = { greenhouse: "Greenhouse", lever: "Lever", "lever-eu": "Lever", ashby: "Ashby", smartrecruiters: "SmartRecruiters" };
const ACCOUNT = /^[a-z0-9_-]+$/;
const UNSUPPORTED = [[/(^|\.)(myworkdayjobs|myworkdaysite)\.com$/, "Workday"], [/(^|\.)amazon\.jobs$/, "Amazon"]];

export function detect(input) {
  let url;
  try {
    url = new URL(String(input ?? "").trim());
  } catch {
    return { error: "This doesn't look like a link. Paste the full address, starting with https://" };
  }
  const tool = Object.hasOwn(HOSTS, url.hostname) ? HOSTS[url.hostname] : null;
  if (!tool) {
    const [, name] = UNSUPPORTED.find(([host]) => host.test(url.hostname)) ?? [];
    if (name) return { error: `${name} job sites can't be followed: they offer no public feed, and browsers don't let other websites read their pages.` };
    // any other link may be an RSS or Atom feed; reading it tells
    return url.protocol === "https:" ? { tool: "rss", account: url.href } : { error: "Only secure links, starting with https://, can be followed." };
  }
  const first = url.pathname.split("/")[1] ?? "";
  // embedded Greenhouse boards look like boards.greenhouse.io/embed/job_board?for=acme
  const account = (tool === "greenhouse" && first === "embed" ? url.searchParams.get("for") ?? "" : first).toLowerCase();
  return ACCOUNT.test(account)
    ? { tool, account }
    : { error: `This ${NAMES[tool]} link doesn't name a company. Paste the link to one of its jobs or to its careers page.` };
}
