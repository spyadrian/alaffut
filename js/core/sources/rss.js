import { safeUrl } from "../safe.js";

// RSS 2.0 and Atom feeds on any site. Node has no DOMParser, so tests pass linkedom's.
const NOT_A_FEED = "This page isn't a job feed. Careers pages are made for people, and browsers don't let one website read another's pages; only Greenhouse, Lever, Ashby, SmartRecruiters and RSS or Atom feeds can be followed.";

const text = (parent, name) => parent.getElementsByTagName(name)[0]?.textContent.trim() ?? "";
const alternate = entry => [...entry.getElementsByTagName("link")]
  .find(link => (link.getAttribute("rel") ?? "alternate") === "alternate")?.getAttribute("href");

export default {
  text: true,
  url: feed => feed,

  parse(body, Parser = globalThis.DOMParser) {
    const doc = new Parser().parseFromString(body, "text/xml");
    const root = doc.documentElement, atom = root?.localName === "feed";
    if ((!atom && root?.localName !== "rss") || doc.getElementsByTagName("parsererror").length) throw new Error(NOT_A_FEED);
    return [...root.getElementsByTagName(atom ? "entry" : "item")]
      .map(item => {
        const url = safeUrl(atom ? alternate(item) : text(item, "link"));
        const date = new Date(text(item, atom ? "published" : "pubDate") || text(item, "updated"));
        return {
          id: text(item, atom ? "id" : "guid") || url,
          title: text(item, "title"),
          location: "",
          published: isNaN(date) ? "" : date.toISOString(),
          url,
        };
      })
      .filter(job => job.url);
  },
};
