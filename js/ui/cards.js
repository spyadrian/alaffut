import { esc, safeUrl } from "../core/safe.js";
import { isNew } from "../core/tracker.js";
import { highlight } from "../core/search.js";
import { visible } from "../core/filters.js";

export const day = iso => iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : "";

// Same name, same colour: a hue from 0 to 359.
export function hue(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

// mark → [label once set, with its date; label otherwise]
const MARKS = {
  applied: [date => `✓ Applied on ${day(date)}`, "I applied"],
  hidden: [() => "Show again", "Not interested"],
};

export function jobHtml(job, company, fresh = false, words = [], first = []) {
  const url = safeUrl(job.url);
  const marks = Object.entries(MARKS).map(([mark, [set, unset]]) =>
    `<button class="mark" data-key="${esc(job.key)}" data-mark="${mark}" aria-pressed="${!!job[mark]}">${job[mark] ? set(job[mark]) : unset}</button>`).join("");
  return `<div class="${["job", job.gone && "gone", job.applied && "applied"].filter(Boolean).join(" ")}">
    <div class="avatar" data-hue="${hue(company)}" aria-hidden="true">${esc(company.slice(0, 1))}</div>
    <div>
      <h4><a ${url ? `href="${esc(url)}"` : ""} target="_blank" rel="noopener">${highlight(job.title, words, first)}</a></h4>
      <div class="meta"><b>${highlight(company, words)}</b><span>${highlight(job.location || "Not specified", words)}</span>${job.published ? `<span>published ${day(job.published)}</span>` : ""}</div>
    </div>
    <div class="side">${job.gone ? `<span class="badge gone">Disappeared on ${day(job.gone)}</span>` : fresh ? `<span class="badge new">New</span>` : ""}<span class="marks">${marks}</span></div>
  </div>`;
}

export const PAGE = 50;

// Only the first `shown` jobs are drawn; `more` offers the next ones. Returns the total.
export function renderJobs(list, more, state, view, shown = PAGE) {
  const names = Object.fromEntries(state.companies.map(c => [c.key, c.name]));
  const jobs = visible(state, view), left = jobs.length - shown;
  const first = (state.rules ?? []).filter(rule => rule.kind === "prioritise").map(rule => rule.word);
  list.innerHTML = jobs.length ? jobs.slice(0, shown).map(job => jobHtml(job, names[job.company] ?? "", isNew(state, job), view.words, first)).join("") : `<div class="empty">No job matches these filters.</div>`;
  // set through the CSSOM, not a style attribute, so the CSP can forbid inline styles
  for (const avatar of list.querySelectorAll(".avatar")) avatar.style.setProperty("--hue", avatar.dataset.hue);
  more.hidden = left <= 0;
  more.textContent = `Show ${Math.min(PAGE, left)} more (${left} left)`;
  return jobs.length;
}
