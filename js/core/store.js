// Everything the visitor follows lives in their browser, under one versioned key.
import { NAMES, ACCOUNT } from "./detect.js";
import { safeUrl } from "./safe.js";

export const KEY = "alaffut:v1";
const empty = () => ({ version: 1, companies: [], jobs: [] });

export function load(storage) {
  const raw = storage.getItem(KEY);
  if (!raw) return empty();
  try {
    return { ...empty(), ...JSON.parse(raw) };
  } catch {
    storage.setItem(KEY + ":unreadable", raw);  // the next save would otherwise erase it
    return empty();
  }
}

export const save = (storage, state) => storage.setItem(KEY, JSON.stringify(state));

export function addCompany(state, { tool, account }, name, jobs, now) {
  const key = `${tool}:${account}`;
  if (state.companies.some(c => c.key === key)) throw new Error("You already follow this company.");
  return {
    ...state,
    companies: [...state.companies, { key, tool, account, name: name.trim() || account, added: now, checked: now, tried: now, error: null }],
    jobs: [...state.jobs, ...jobs.map(job => ({ ...job, key: `${key}:${job.id}`, company: key, spotted: now }))],
  };
}

// A mark holds the date it was set; setting it again removes it.
export function toggleMark(state, jobKey, mark, now) {
  if (mark !== "applied" && mark !== "hidden") throw new Error(`Unknown mark: ${mark}`);
  return {
    ...state,
    jobs: state.jobs.map(job => {
      if (job.key !== jobKey) return job;
      const { [mark]: set, ...rest } = job;
      return set ? rest : { ...rest, [mark]: now };
    }),
  };
}

// An empty name keeps the current one.
export const renameCompany = (state, key, name) => ({
  ...state,
  companies: state.companies.map(c => c.key === key && name.trim() ? { ...c, name: name.trim() } : c),
});

export const removeCompany = (state, key) => ({
  ...state,
  companies: state.companies.filter(c => c.key !== key),
  jobs: state.jobs.filter(job => job.company !== key),
});

// A backup holds what the visitor follows and marked, not the current visit.
export const backup = (state, now) =>
  JSON.stringify({ app: "alaffut", version: 1, exported: now, companies: state.companies, jobs: state.jobs }, null, 1);

const COMPANY = { key: 1, tool: 1, account: 1, name: 1, added: 1, checked: 1, tried: 1, error: 0, warning: 0 };
const JOB = { key: 1, company: 1, id: 1, title: 1, location: 1, published: 1, url: 1, spotted: 1, gone: 0, applied: 0, hidden: 0 };

// Copies only the known fields: each required one must be a string, an optional one a string or null.
function pick(item, fields) {
  if (typeof item !== "object" || item === null) throw new Error("an entry isn't an object");
  const copy = {};
  for (const [field, required] of Object.entries(fields)) {
    const value = item[field];
    if (typeof value === "string" || (!required && value === null)) copy[field] = value;
    else if (required || value !== undefined) throw new Error(`"${field}" is missing or isn't text`);
  }
  return copy;
}

function unique(items) {
  const keys = new Set(items.map(item => item.key));
  if (keys.size !== items.length) throw new Error("an entry appears twice");
  return keys;
}

// The file comes from anywhere: rebuild the state from checked fields, or throw without touching anything.
export function restore(state, text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {}
  if (data?.app !== "alaffut") throw new Error("This file isn't a backup from À l'affût.");
  if (data.version !== 1) throw new Error("This backup comes from another version of À l'affût and can't be read.");
  try {
    if (!Array.isArray(data.companies) || !Array.isArray(data.jobs)) throw new Error("the lists are missing");
    const companies = data.companies.map(c => pick(c, COMPANY));
    for (const c of companies) {
      const fine = Object.hasOwn(NAMES, c.tool) && c.key === `${c.tool}:${c.account}` && c.name.trim()
        && (c.tool === "rss" ? safeUrl(c.account) === c.account : ACCOUNT.test(c.account));
      if (!fine) throw new Error(`the company "${c.name}" isn't valid`);
    }
    const followed = unique(companies);
    const jobs = data.jobs.map(job => pick(job, JOB));
    for (const job of jobs) {
      if (!followed.has(job.company) || job.key !== `${job.company}:${job.id}`) throw new Error(`the job "${job.title}" belongs to no company`);
      if (!safeUrl(job.url)) throw new Error(`the job "${job.title}" has an unsafe link`);
    }
    unique(jobs);
    return { ...state, companies, jobs };
  } catch (error) {
    throw new Error(`This backup is damaged and can't be imported: ${error.message}.`);
  }
}
