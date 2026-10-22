// Everything the visitor follows lives in their browser, under one versioned key.
import { NAMES, ACCOUNT } from "./detect.js";
import { safeUrl } from "./safe.js";
import { wordsOf } from "./search.js";

export const KEY = "alaffut:v1";
const empty = () => ({ version: 1, companies: [], jobs: [], rules: [] });

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

// Title rules: a new word hides jobs, and a click moves it on to the next kind.
export const RULES = ["exclude", "prioritise", "require"];
const sameWord = (rule, word) => wordsOf(rule.word) === wordsOf(word);

export function addRule(state, word) {
  word = word.trim();
  if (wordsOf(word) === "  " || state.rules.some(rule => sameWord(rule, word))) return state;
  return { ...state, rules: [...state.rules, { word, kind: "exclude" }] };
}

export const nextRule = (state, word) => ({
  ...state,
  rules: state.rules.map(rule => sameWord(rule, word) ? { ...rule, kind: RULES[(RULES.indexOf(rule.kind) + 1) % RULES.length] } : rule),
});

export const removeRule = (state, word) => ({ ...state, rules: state.rules.filter(rule => !sameWord(rule, word)) });

export const dropBlocked = (state, blocked) => blocked.reduce(removeCompany, state);

// A backup holds what the visitor follows and marked, not the current visit.
export const backup = (state, now) =>
  JSON.stringify({ app: "alaffut", version: 1, exported: now, companies: state.companies, jobs: state.jobs, rules: state.rules }, null, 1);

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
    if (data.rules === undefined) return { ...state, companies, jobs };  // a backup from before rules existed
    if (!Array.isArray(data.rules)) throw new Error("the title rules aren't a list");
    const rules = data.rules.map(rule => pick(rule, { word: 1, kind: 1 }));
    for (const rule of rules) if (!RULES.includes(rule.kind) || wordsOf(rule.word) === "  ") throw new Error(`the title rule "${rule.word}" isn't valid`);
    return { ...state, companies, jobs, rules };
  } catch (error) {
    throw new Error(`This backup is damaged and can't be imported: ${error.message}.`);
  }
}
