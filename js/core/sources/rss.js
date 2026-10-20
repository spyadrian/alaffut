import { safeUrl } from "../safe.js";

// RSS 2.0 and Atom feeds on any site. Node has no DOMParser, so tests pass linkedom's.
const NOT_A_FEED = "This page isn't a job feed. Careers pages are made for people, and browsers don't let one website read another's pages; only Greenhouse, Lever, Ashby, SmartRecruiters and RSS or Atom feeds can be followed.";
// WordPress feeds (CERN) give 10 jobs per page under ?paged=N; Teamtailor ones give 100 and ignore paged.
const PAGES = 10, FULL_PAGE = 100;

// Feeds name their tags with any prefix (tt:location), so match the name after it.
const local = el => el.tagName.split(":").pop();
const tags = (parent, name) => [...parent.querySelectorAll("*")].filter(el => local(el) === name);
const text = (parent, name) => tags(parent, name)[0]?.textContent.trim() ?? "";
const alternate = entry => tags(entry, "link")
  .find(link => (link.getAttribute("rel") ?? "alternate") === "alternate")?.getAttribute("href");

// <location> as text or with city and country inside, else <city>, else <region> and <country>.
function place(item) {
  const places = tags(item, "location")
    .map(el => el.children.length ? [text(el, "city"), text(el, "country")].filter(Boolean).join(", ") : el.textContent.trim())
    .filter(Boolean);
  if (places.length) return places.join(" · ");
  return text(item, "city") || [text(item, "region"), text(item, "country")].filter(Boolean).join(", ");
}

function paged(feed, page) {
  const url = new URL(feed);
  url.searchParams.set("paged", page);
  return url.href;
}

export default {
  text: true,

  // → {jobs, warning?}: later pages are read until one brings nothing new.
  async read(feed, getText, Parser = globalThis.DOMParser) {
    const jobs = new Map();
    let full = true;  // stays true if every page read brought new jobs and the last one may not be the end
    for (let page = 1; page <= PAGES; page++) {
      let body;
      try {
        body = await getText(page === 1 ? feed : paged(feed, page));
      } catch (error) {
        if (page === 1) throw error;
        full = error.status !== 404;  // 404 past the last WordPress page is the normal end
        break;
      }
      const before = jobs.size, found = this.parse(body, Parser);
      for (const job of found) if (!jobs.has(job.id)) jobs.set(job.id, job);
      if (jobs.size === before) {
        full = page === 2 && before >= FULL_PAGE;  // one big page and paged ignored: maybe a capped feed
        break;
      }
    }
    const result = { jobs: [...jobs.values()] };
    if (full) result.warning = `Only the first ${jobs.size} jobs are followed; there may be others, which aren't checked.`;
    return result;
  },

  parse(body, Parser = globalThis.DOMParser) {
    const doc = new Parser().parseFromString(body, "text/xml");
    const root = doc.documentElement, kind = root ? local(root) : "";
    if (!["rss", "feed"].includes(kind) || doc.getElementsByTagName("parsererror").length) throw new Error(NOT_A_FEED);
    const atom = kind === "feed";
    return tags(root, atom ? "entry" : "item")
      .map(item => {
        const url = safeUrl(atom ? alternate(item) : tags(item, "link").map(link => link.textContent.trim()).find(Boolean));
        const date = new Date(text(item, atom ? "published" : "pubDate") || text(item, "updated"));
        return {
          id: text(item, atom ? "id" : "guid") || url,
          title: text(item, "title"),
          location: place(item),
          published: isNaN(date) ? "" : date.toISOString(),
          url,
        };
      })
      .filter(job => job.url);
  },
};
