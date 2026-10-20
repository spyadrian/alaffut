// Key figures, the "Needs attention" banner and the time of the last check.
import { esc } from "../core/safe.js";
import { figures } from "../core/tracker.js";

const $ = s => document.querySelector(s);
const pad = n => String(n).padStart(2, "0");
const local = iso => {
  const d = new Date(iso);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} at ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function summaryHtml(state) {
  const f = figures(state);
  const broken = state.companies.filter(c => c.error);
  return {
    figures: [
      [f.open, "open jobs", ""],
      [f.new, "new since your last visit", "green"],
      [f.applied, "applications sent", ""],
      [f.errors, "sources with errors", f.errors ? "red" : ""],
    ].map(([n, label, colour]) => `<div class="figure"><b${colour ? ` class="${colour}"` : ""}>${n}</b><span>${label}</span></div>`).join(""),
    banners: broken.length ? `<div class="banner error" role="alert"><h3>Needs attention</h3><ul>
      ${broken.map(c => `<li><b>${esc(c.name)}</b>: ${esc(c.error)}</li>`).join("")}</ul></div>` : "",
  };
}

export function renderSummary(state) {
  const html = summaryHtml(state);
  $("#figures").innerHTML = html.figures;
  $("#banners").innerHTML = html.banners;
  const last = state.companies.map(c => c.checked).filter(Boolean).sort().at(-1);
  $("#last-run").innerHTML = last ? `Last check<br>${local(last)}` : "";
}
