// City and company checklists, each with its "Show all" reset. A choice that would show nothing is greyed, not removed.
import { esc } from "../core/safe.js";

const $ = s => document.querySelector(s);

export function renderChoices(choices, view) {
  for (const list of ["cities", "companies"]) {
    $(`#${list}`).innerHTML = choices[list].map(({ value, label, count }) =>
      `<label${count ? "" : ' class="none"'}><input type="checkbox" data-list="${list}" value="${esc(value)}"${view[list].has(value) ? " checked" : ""}><span>${esc(label)}</span><small>${count}</small></label>`).join("");
    $(`[data-clear=${list}]`).hidden = !view[list].size;
  }
}
