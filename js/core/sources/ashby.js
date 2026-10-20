import { safeUrl } from "../safe.js";

// Public job board API, CORS open, account name case-insensitive (checked October 2026).
export default {
  url: account => `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(account)}`,

  parse(data) {
    if (!Array.isArray(data?.jobs)) throw new Error("The source didn't send a job list.");
    return data.jobs
      // unlisted jobs are only reachable by direct link; the company chose not to publish them
      .filter(job => job.isListed === true)
      .map(job => {
        const places = [job.location, ...(job.secondaryLocations ?? []).map(place => place?.location)];
        return {
          id: String(job.id),
          title: String(job.title ?? "").trim(),
          location: places.map(place => String(place ?? "").trim()).filter(Boolean).join(" · "),
          published: String(job.publishedAt ?? ""),
          url: safeUrl(job.jobUrl),
        };
      })
      .filter(job => job.url);
  },
};
