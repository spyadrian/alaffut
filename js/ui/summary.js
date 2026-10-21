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
  const broken = state.companies.filter(c => c.error || c.warning);
  return {
    figures: [
      [f.open, "open jobs", ""],
      [f.new, "new since your last visit", "green"],
      [f.applied, "applications sent", ""],
      [f.errors, "sources with errors", f.errors ? "red" : ""],
    ].map(([n, label, colour]) => `<b${colour ? ` class="${colour}"` : ""}>${n}</b><span>${label}</span>`)
      // the errors figure brings back a hidden banner
      .map((inner, i) => i === 3 && broken.length ? `<button class="figure" data-errors>${inner}</button>` : `<div class="figure">${inner}</div>`).join(""),
    banners: broken.length ? `<div class="banner error" role="alert" data-dismiss><h3>Needs attention <button class="link-button">Hide</button></h3><ul>
      ${broken.map(c => `<li><b>${esc(c.name)}</b>: ${esc(c.error || c.warning)}</li>`).join("")}</ul></div>` : "",
  };
}

// The banner the user hid stays hidden until its content changes.
let banner = "", hidden = "";

export function setupSummary() {
  $("#banners").addEventListener("click", e => {
    const box = e.target.closest("[data-dismiss]");
    if (!box) return;
    hidden = banner;
    box.remove();
  });
  $("#figures").addEventListener("click", e => {
    if (!e.target.closest("[data-errors]") || !hidden) return;
    hidden = "";
    $("#banners").insertAdjacentHTML("beforeend", banner);
  });
}

export function renderSummary(state) {
  const html = summaryHtml(state);
  $("#figures").innerHTML = html.figures;
  banner = html.banners;
  if (!banner) hidden = "";  // a problem that comes back later is shown again
  $("#banners").innerHTML = banner === hidden ? "" : banner;
  const last = state.companies.map(c => c.checked).filter(Boolean).sort().at(-1);
  $("#last-run").innerHTML = last ? `Last check<br>${local(last)}` : "";
}
