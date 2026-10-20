// Which jobs each status shows. A job marked Not interested only appears in that status.
import { isNew } from "./tracker.js";

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
