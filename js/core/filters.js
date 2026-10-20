// Which jobs each status shows. A job marked Not interested only appears in that status.
import { isNew } from "./tracker.js";
import { cities, cityKey, NOWHERE } from "./cities.js";
import { matches } from "./search.js";

export const STATUSES = {
  open: ["Open jobs", (state, job) => !job.hidden && !job.gone],
  new: ["New jobs", (state, job) => !job.hidden && isNew(state, job)],
  applied: ["Applied", (state, job) => !job.hidden && !!job.applied],
  gone: ["Disappeared jobs", (state, job) => !job.hidden && !!job.gone],
  all: ["All jobs", (state, job) => !job.hidden],
  hidden: ["Jobs I'm not interested in", (state, job) => !!job.hidden],
};

export const inStatus = (state, status, job) => STATUSES[status][1](state, job);

export const counts = state => Object.fromEntries(Object.keys(STATUSES).map(s => [s, state.jobs.filter(job => inStatus(state, s, job)).length]));

const by = (a, b) => a.localeCompare(b, "en", { sensitivity: "base" });
const names = state => Object.fromEntries(state.companies.map(c => [c.key, c.name]));

// Sort orders; published dates are ISO strings, so they compare as text.
export const SORTS = {
  spotted: (a, b) => b.spotted.localeCompare(a.spotted) || (b.published ?? "").localeCompare(a.published ?? ""),
  published: (a, b) => (b.published ?? "").localeCompare(a.published ?? ""),
  company: (a, b, name) => by(name[a.company] ?? "", name[b.company] ?? "") || by(a.title, b.title),
  title: (a, b) => by(a.title, b.title),
};

// view: {status, sort, words, cities: Set, companies: Set}; an empty set means no filter.
export function visible(state, view) {
  const name = names(state);
  return state.jobs.filter(job => inStatus(state, view.status, job)
      && (!view.companies.size || view.companies.has(job.company))
      && (!view.cities.size || cities(job.location).some(city => view.cities.has(cityKey(city))))
      && matches([job.title, name[job.company] ?? "", job.location || NOWHERE], view.words))
    .sort((a, b) => SORTS[view.sort](a, b, name));
}

// Every city and company, with how many jobs of the current status each has.
// A city is shown with its most frequent spelling across all jobs.
export function choices(state, status) {
  const perCity = new Map(), perCompany = new Map(state.companies.map(c => [c.key, 0]));
  for (const job of state.jobs) {
    const one = inStatus(state, status, job) ? 1 : 0;
    const spelled = new Map();  // city key → its first spelling in this job
    for (const city of cities(job.location)) if (!spelled.has(cityKey(city))) spelled.set(cityKey(city), city);
    for (const [key, city] of spelled) {
      const entry = perCity.get(key) ?? { count: 0, spellings: new Map() };
      entry.count += one;
      entry.spellings.set(city, (entry.spellings.get(city) ?? 0) + 1);
      perCity.set(key, entry);
    }
    perCompany.set(job.company, (perCompany.get(job.company) ?? 0) + one);
  }
  const name = names(state);
  const usual = spellings => [...spellings].reduce((best, next) => next[1] > best[1] ? next : best)[0];
  return {
    cities: [...perCity].map(([key, { count, spellings }]) => ({ value: key, label: usual(spellings), count })).sort((a, b) => b.count - a.count || by(a.label, b.label)),
    companies: state.companies.map(c => ({ value: c.key, label: name[c.key], count: perCompany.get(c.key) })).sort((a, b) => by(a.label, b.label)),
  };
}
