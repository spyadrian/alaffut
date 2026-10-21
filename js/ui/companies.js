// "Companies": the followed list, where each one can be renamed or removed.
import { esc } from "../core/safe.js";
import { NAMES } from "../core/detect.js";
import { hue, day } from "./cards.js";

const $ = s => document.querySelector(s);

export function companyHtml(company, jobs) {
  const open = jobs.filter(job => job.company === company.key && !job.gone).length;
  const check = company.error ? `<span class="red">${esc(company.error)}</span>`
    : company.warning ? `<span class="amber">${esc(company.warning)}</span>`
    : `<span>Checked ${day(company.checked)}</span>`;
  return `<li>
    <div class="avatar" data-hue="${hue(company.name)}" aria-hidden="true">${esc(company.name.slice(0, 1))}</div>
    <div>
      <input class="rename" data-key="${esc(company.key)}" value="${esc(company.name)}" maxlength="80" aria-label="Name of ${esc(company.name)}" autocomplete="off">
      <div class="meta"><span>${NAMES[company.tool] ?? esc(company.tool)}</span><span>${open} open job${open === 1 ? "" : "s"}</span>${check}</div>
    </div>
    <button class="mark remove" data-key="${esc(company.key)}" aria-pressed="false">Remove</button>
  </li>`;
}

export function renderCompanies(state) {
  const list = $("#company-list");
  list.innerHTML = state.companies.length ? state.companies.map(c => companyHtml(c, state.jobs)).join("") : `<li class="empty">You're not following any company yet.</li>`;
  for (const avatar of list.querySelectorAll(".avatar")) avatar.style.setProperty("--hue", avatar.dataset.hue);
}
