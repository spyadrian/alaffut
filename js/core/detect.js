// A pasted link → which tool hosts the board and under which account, or a reason why not.

const GREENHOUSE = ["boards.greenhouse.io", "job-boards.greenhouse.io", "job-boards.eu.greenhouse.io"];
const ACCOUNT = /^[a-z0-9_-]+$/;

export function detect(input) {
  let url;
  try {
    url = new URL(String(input ?? "").trim());
  } catch {
    return { error: "This doesn't look like a link. Paste the full address, starting with https://" };
  }
  if (GREENHOUSE.includes(url.hostname)) {
    const first = url.pathname.split("/")[1] ?? "";
    // embedded boards look like boards.greenhouse.io/embed/job_board?for=acme
    const account = (first === "embed" ? url.searchParams.get("for") ?? "" : first).toLowerCase();
    return ACCOUNT.test(account)
      ? { tool: "greenhouse", account }
      : { error: "This Greenhouse link doesn't name a company. Paste the link to one of its jobs or to its careers page." };
  }
  return { error: "This site isn't supported. Paste a link to a job or careers page hosted on Greenhouse." };
}
