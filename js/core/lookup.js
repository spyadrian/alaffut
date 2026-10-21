// A company name → the boards that probably are its own, tried on every tool at once.
import { readSource } from "./fetch.js";

// Careers pages people can open to check a guess. Teamtailor feeds are CORS open and 404 when unknown (checked October 2026).
const TOOLS = {
  greenhouse: a => ({ page: `https://job-boards.greenhouse.io/${a}` }),
  lever: a => ({ page: `https://jobs.lever.co/${a}` }),
  "lever-eu": a => ({ page: `https://jobs.eu.lever.co/${a}` }),
  ashby: a => ({ page: `https://jobs.ashbyhq.com/${a}` }),
  smartrecruiters: a => ({ page: `https://careers.smartrecruiters.com/${a}` }),
  rss: a => ({ account: `https://${a}.teamtailor.com/jobs.rss`, page: `https://${a}.teamtailor.com/jobs` }),
};

// Links always have a slash; company names (even Booking.com) don't.
export const isName = input => !String(input).includes("/");

// "Back Market" → backmarket, back-market
export function guesses(name) {
  const words = name.normalize("NFD").replace(/[̀-ͯ'’]/g, "").toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return [...new Set([words.join(""), words.join("-")])].filter(Boolean);
}

// skip: "tool:account" keys already followed or blocked. → [{source, jobs, warning?}], most jobs first, never throws.
export async function lookup(name, skip = [], read = readSource) {
  const sources = guesses(name).flatMap(account =>
    Object.entries(TOOLS).map(([tool, more]) => ({ tool, account, ...more(account) })));
  const found = await Promise.all(sources
    .filter(source => !skip.includes(`${source.tool}:${source.account}`))
    .map(source => read(source).then(answer => ({ source, ...answer }), () => null)));
  // SmartRecruiters answers an unknown company with an empty list, so no jobs means not found
  return found.filter(f => f?.jobs.length).sort((a, b) => b.jobs.length - a.jobs.length);
}
