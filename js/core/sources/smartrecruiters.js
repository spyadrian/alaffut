import { safeUrl } from "../safe.js";

// Public postings API, CORS open, identifier case-insensitive, 100 jobs per page at most (checked October 2026).
// An unknown company answers 200 with no jobs, not 404.
const LIMIT = 100, PAGES = 10;

export default {
  url: (account, offset = 0) =>
    `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(account)}/postings?limit=${LIMIT}&offset=${offset}`,

  async read(account, getJson) {
    const jobs = [];
    let total = 0;
    for (let page = 0; page < PAGES; page++) {
      const data = await getJson(this.url(account, jobs.length));
      if (!Array.isArray(data?.content)) throw new Error("The source didn't send a job list.");
      jobs.push(...data.content);
      total = Number(data.totalFound) || 0;
      if (!data.content.length || jobs.length >= total) break;
    }
    const result = { jobs: jobs.map(job).filter(job => job.url) };
    if (total > jobs.length) result.warning = `Only the first ${jobs.length} of its ${total} jobs are followed; the others aren't checked.`;
    return result;
  },
};

function job(posting) {
  const place = posting.location ?? {};
  return {
    id: String(posting.id),
    title: String(posting.name ?? "").trim(),
    location: String(place.fullLocation ?? [place.city, place.country].filter(Boolean).join(", ")).trim(),
    published: String(posting.releasedDate ?? ""),
    // the API gives no link; this is the posting page on the company's careers site
    url: safeUrl(`https://jobs.smartrecruiters.com/${encodeURIComponent(posting.company?.identifier ?? "")}/${encodeURIComponent(posting.id)}`),
  };
}
