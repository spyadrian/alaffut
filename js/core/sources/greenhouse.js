import { safeUrl } from "../safe.js";

// One API host serves all boards, including job-boards.eu.greenhouse.io ones (checked October 2026).
export default {
  url: account => `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(account)}/jobs`,

  parse(data) {
    if (!Array.isArray(data?.jobs)) throw new Error("The source didn't send a job list.");
    return data.jobs
      .map(job => ({
        id: String(job.id),
        title: String(job.title ?? "").trim(),
        location: String(job.location?.name ?? "").trim(),
        published: String(job.first_published ?? job.updated_at ?? ""),
        url: safeUrl(job.absolute_url),
      }))
      .filter(job => job.url);
  },
};
