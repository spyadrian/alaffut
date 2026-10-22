// Which jobs each status shows. A job marked Not interested only appears in that status.
import { isNew } from "./tracker.js";
import { cities, cityKey, NOWHERE } from "./cities.js";
import { matches, wordsOf, hasWords } from "./search.js";

export const STATUSES = {
  open: ["Open jobs", (state, job) => !job.hidden && !job.gone],
  new: ["New jobs", (state, job) => !job.hidden && isNew(state, job)],
  applied: ["Applied", (state, job) => !job.hidden && !!job.applied],
  gone: ["Disappeared jobs", (state, job) => !job.hidden && !!job.gone],
  all: ["All jobs", (state, job) => !job.hidden],
  hidden: ["Jobs I'm not interested in", (state, job) => !!job.hidden],
};

export const inStatus = (state, status, job) => STATUSES[status][1](state, job);

// Title rules: a red word hides the job, even when a green one is there too; with yellow words, one is enough.
const rulesOf = state => {
  const words = kind => (state.rules ?? []).filter(rule => rule.kind === kind).map(rule => wordsOf(rule.word));
  return { exclude: words("exclude"), prioritise: words("prioritise"), require: words("require") };
};
const allowed = (rules, job) => !rules.exclude.some(w => hasWords(job.title, w)) && (!rules.require.length || rules.require.some(w => hasWords(job.title, w)));

export const counts = state => {
  const rules = rulesOf(state);
  return Object.fromEntries(Object.keys(STATUSES).map(s => [s, state.jobs.filter(job => inStatus(state, s, job) && allowed(rules, job)).length]));
};

const by = (a, b) => a.localeCompare(b, "en", { sensitivity: "base" });
const names = state => Object.fromEntries(state.companies.map(c => [c.key, c.name]));

// Sort orders; published dates are ISO strings, so they compare as text.
export const SORTS = {
  spotted: (a, b) => b.spotted.localeCompare(a.spotted) || (b.published ?? "").localeCompare(a.published ?? ""),
  published: (a, b) => (b.published ?? "").localeCompare(a.published ?? ""),
  company: (a, b, name) => by(name[a.company] ?? "", name[b.company] ?? "") || by(a.title, b.title),
  title: (a, b) => by(a.title, b.title),
};

// Which filters a job passes. Each checklist counts jobs passing all the others but not its own ticks.
function passes(state, view, name, rules, job) {
  return {
    rest: inStatus(state, view.status, job) && allowed(rules, job) && matches([job.title, name[job.company] ?? "", job.location || NOWHERE], view.words),
    company: !view.companies.size || view.companies.has(job.company),
    city: !view.cities.size || cities(job.location).some(city => view.cities.has(cityKey(city))),
  };
}

// view: {status, sort, words, cities: Set, companies: Set}; an empty set means no filter.
export function visible(state, view) {
  const name = names(state), rules = rulesOf(state);
  const first = job => rules.prioritise.some(w => hasWords(job.title, w));
  return state.jobs.filter(job => {
    const p = passes(state, view, name, rules, job);
    return p.rest && p.company && p.city;
  }).map(job => [first(job), job]).sort(([x, a], [y, b]) => y - x || SORTS[view.sort](a, b, name)).map(([, job]) => job);
}

// Every city and company, with how many jobs it would add to the list.
// A city is shown with its most frequent spelling across all jobs.
export function choices(state, view) {
  const name = names(state), rules = rulesOf(state);
  const perCity = new Map(), perCompany = new Map(state.companies.map(c => [c.key, 0]));
  for (const job of state.jobs) {
    const p = passes(state, view, name, rules, job);
    const spelled = new Map();  // city key → its first spelling in this job
    for (const city of cities(job.location)) if (!spelled.has(cityKey(city))) spelled.set(cityKey(city), city);
    for (const [key, city] of spelled) {
      const entry = perCity.get(key) ?? { count: 0, spellings: new Map() };
      entry.count += p.rest && p.company ? 1 : 0;
      entry.spellings.set(city, (entry.spellings.get(city) ?? 0) + 1);
      perCity.set(key, entry);
    }
    perCompany.set(job.company, (perCompany.get(job.company) ?? 0) + (p.rest && p.city ? 1 : 0));
  }
  const usual = spellings => [...spellings].reduce((best, next) => next[1] > best[1] ? next : best)[0];
  const last = city => city.label === NOWHERE;
  return {
    cities: [...perCity].map(([key, { count, spellings }]) => ({ value: key, label: usual(spellings), count })).sort((a, b) => last(a) - last(b) || by(a.label, b.label)),
    companies: state.companies.map(c => ({ value: c.key, label: name[c.key], count: perCompany.get(c.key) })).sort((a, b) => by(a.label, b.label)),
  };
}

// A ticked city or company that no job or followed company has anymore stops filtering.
export function prune(state, view) {
  const exists = {
    cities: new Set(state.jobs.flatMap(job => cities(job.location).map(cityKey))),
    companies: new Set(state.companies.map(c => c.key)),
  };
  for (const list of ["cities", "companies"]) for (const value of view[list]) if (!exists[list].has(value)) view[list].delete(value);
}
