import { esc, safeUrl } from "../core/safe.js";
import { isNew } from "../core/tracker.js";

export const day = iso => iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : "";

// Same name, same colour: a hue from 0 to 359.
function hue(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export function jobHtml(job, company, fresh = false) {
  const url = safeUrl(job.url);
  return `<div class="job">
    <div class="avatar" data-hue="${hue(company)}" aria-hidden="true">${esc(company.slice(0, 1))}</div>
    <div>
      <h4><a ${url ? `href="${esc(url)}"` : ""} target="_blank" rel="noopener">${esc(job.title)}</a></h4>
      <div class="meta"><b>${esc(company)}</b>${job.location ? `<span>${esc(job.location)}</span>` : ""}${job.published ? `<span>published ${day(job.published)}</span>` : ""}</div>
    </div>
    <div class="side">${job.gone ? `<span class="badge gone">Disappeared on ${day(job.gone)}</span>` : fresh ? `<span class="badge new">New</span>` : ""}</div>
  </div>`;
}

export function renderJobs(list, state) {
  const names = Object.fromEntries(state.companies.map(c => [c.key, c.name]));
  const jobs = [...state.jobs].sort((a, b) => b.spotted.localeCompare(a.spotted) || b.published.localeCompare(a.published));
  list.innerHTML = jobs.map(job => jobHtml(job, names[job.company] ?? "", isNew(state, job))).join("");
  // set through the CSSOM, not a style attribute, so the CSP can forbid inline styles
  for (const avatar of list.querySelectorAll(".avatar")) avatar.style.setProperty("--hue", avatar.dataset.hue);
  return jobs.length;
}
