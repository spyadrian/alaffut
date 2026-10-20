// A pasted link → which tool hosts the board and under which account, or a reason why not.

const HOSTS = {
  "boards.greenhouse.io": "greenhouse",
  "job-boards.greenhouse.io": "greenhouse",
  "job-boards.eu.greenhouse.io": "greenhouse",
  "jobs.lever.co": "lever",
  // EU accounts only answer on the EU API, so the region is part of the tool
  "jobs.eu.lever.co": "lever-eu",
};
const NAMES = { greenhouse: "Greenhouse", lever: "Lever", "lever-eu": "Lever" };
const ACCOUNT = /^[a-z0-9_-]+$/;

export function detect(input) {
  let url;
  try {
    url = new URL(String(input ?? "").trim());
  } catch {
    return { error: "This doesn't look like a link. Paste the full address, starting with https://" };
  }
  const tool = Object.hasOwn(HOSTS, url.hostname) ? HOSTS[url.hostname] : null;
  if (!tool) return { error: "This site isn't supported. Paste a link to a job or careers page hosted on Greenhouse or Lever." };
  const first = url.pathname.split("/")[1] ?? "";
  // embedded Greenhouse boards look like boards.greenhouse.io/embed/job_board?for=acme
  const account = (tool === "greenhouse" && first === "embed" ? url.searchParams.get("for") ?? "" : first).toLowerCase();
  return ACCOUNT.test(account)
    ? { tool, account }
    : { error: `This ${NAMES[tool]} link doesn't name a company. Paste the link to one of its jobs or to its careers page.` };
}
