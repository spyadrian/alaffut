// What changed since the last check of each source, and since the visitor's last visit.

const MINUTE = 60e3;
const ago = (now, iso) => iso ? Date.parse(now) - Date.parse(iso) : Infinity;

// A visit ends after an hour without opening the site; jobs spotted since it began are New.
export function startVisit(state, now) {
  const fresh = !state.visit || ago(now, state.visit.seen) > 60 * MINUTE;
  return { ...state, visit: { since: fresh ? now : state.visit.since, seen: now } };
}

// Spare the job sites: on opening, only sources not checked for 15 min; on demand, at most every 2 min.
export const due = (company, now, force = false) =>
  ago(now, company.tried) >= 2 * MINUTE && (force || ago(now, company.checked) >= 15 * MINUTE);

// result is {jobs, warning?} after a successful answer, or {error} otherwise; a warning means jobs are missing.
export function merge(state, key, result, now) {
  const companies = state.companies.map(c => c.key !== key ? c
    : result.error ? { ...c, tried: now, error: result.error }
    : { ...c, tried: now, checked: now, error: null, warning: result.warning ?? null });
  const visit = state.visit && { ...state.visit, seen: now };  // checking a source means the visitor is here
  if (result.error) return { ...state, companies, visit };  // a failed answer says nothing about which jobs are gone

  const found = new Map(result.jobs.map(job => [`${key}:${job.id}`, job]));
  const jobs = state.jobs.map(job => {
    if (job.company !== key) return job;
    const fresh = found.get(job.key);
    found.delete(job.key);
    if (fresh) {
      const { gone, ...open } = { ...job, ...fresh };  // a job that reappears is open again
      return open;
    }
    return job.gone || result.warning ? job : { ...job, gone: now };
  });
  for (const [jobKey, job] of found) jobs.push({ ...job, key: jobKey, company: key, spotted: now });
  return { ...state, companies, visit, jobs };
}

// Jobs from the first check of a company share its "added" time and are never New.
export function isNew(state, job) {
  const added = state.companies.find(c => c.key === job.company)?.added;
  return !job.gone && job.spotted !== added && job.spotted >= (state.visit?.since ?? "");
}

export const figures = state => ({
  open: state.jobs.filter(j => !j.gone && !j.hidden).length,
  new: state.jobs.filter(j => !j.hidden && isNew(state, j)).length,
  applied: state.jobs.filter(j => j.applied).length,
  errors: state.companies.filter(c => c.error).length,
});
