// Everything the visitor follows lives in their browser, under one versioned key.

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
