import { safeUrl } from "../safe.js";

// Same postings API on two hosts; an EU account gets 404 from the US one (checked October 2026).
const source = host => ({
  url: account => `https://${host}/v0/postings/${encodeURIComponent(account)}?mode=json`,

  parse(data) {
    if (!Array.isArray(data)) throw new Error("The source didn't send a job list.");
    return data
      .map(job => {
        const places = job.categories?.allLocations ?? [job.categories?.location];
        return {
          id: String(job.id),
          title: String(job.text ?? "").trim(),
          location: places.map(place => String(place ?? "").trim()).filter(Boolean).join(" · "),
          published: Number.isFinite(job.createdAt) ? new Date(job.createdAt).toISOString() : "",
          url: safeUrl(job.hostedUrl),
        };
      })
      .filter(job => job.url);
  },
});

export const lever = source("api.lever.co");
export const leverEu = source("api.eu.lever.co");
