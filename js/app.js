import { load, save, addCompany } from "./core/store.js";
import { renderJobs } from "./ui/cards.js";
import { setupAdd } from "./ui/add.js";

const $ = s => document.querySelector(s);
const empty = $("#list").innerHTML;
let state = load(localStorage);

function render() {
  if (!state.jobs.length) {
    $("#list").innerHTML = empty;
    $("#count").textContent = "0 results";
    return;
  }
  const n = renderJobs($("#list"), state);
  $("#count").textContent = `${n} result${n === 1 ? "" : "s"}`;
}

setupAdd({
  getState: () => state,
  onAdd(source, name, jobs) {
    const next = addCompany(state, source, name, jobs, new Date().toISOString());
    try {
      save(localStorage, next);
    } catch {
      throw new Error("Your browser refused to save. Free some space in its storage and try again.");
    }
    state = next;
    render();
  },
});

$("#show-filters").onclick = e => {
  const open = $("#filters").classList.toggle("open");
  e.target.setAttribute("aria-expanded", open);
  e.target.textContent = open ? "Hide filters" : "Filters";
};

render();
