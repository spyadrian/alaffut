import { load, save, addCompany } from "./core/store.js";
import { startVisit, due, merge } from "./core/tracker.js";
import { readAll } from "./core/fetch.js";
import { renderJobs } from "./ui/cards.js";
import { renderSummary } from "./ui/summary.js";
import { setupAdd } from "./ui/add.js";

const $ = s => document.querySelector(s);
const now = () => new Date().toISOString();
const empty = $("#list").innerHTML;
const QUOTA = "Your browser refused to save. Free some space in its storage and try again.";
let state = startVisit(load(localStorage), now());

function persist() {
  try {
    save(localStorage, state);
    return true;
  } catch {
    return false;
  }
}

function render() {
  renderSummary(state);
  if (!state.jobs.length) {
    $("#list").innerHTML = empty;
    $("#count").textContent = "0 results";
    return;
  }
  const n = renderJobs($("#list"), state);
  $("#count").textContent = `${n} result${n === 1 ? "" : "s"}`;
}

async function refresh(force) {
  const todo = state.companies.filter(c => due(c, now(), force));
  if (!todo.length) return;
  const button = $("#refresh"), bar = $("#progress-bar");
  let done = 0;
  button.disabled = true;
  button.textContent = `Checking… 0/${todo.length}`;
  bar.style.width = "4%";
  await readAll(todo, (company, result) => {
    state = merge(state, company.key, result, now());
    button.textContent = `Checking… ${++done}/${todo.length}`;
    bar.style.width = `${100 * done / todo.length}%`;
    render();
  });
  button.disabled = false;
  button.textContent = "Refresh";
  bar.style.width = "0";
  if (!persist()) $("#banners").insertAdjacentHTML("afterbegin", `<div class="banner error" role="alert"><h3>Not saved</h3>${QUOTA}</div>`);
}

setupAdd({
  getState: () => state,
  onAdd(source, name, jobs) {
    const previous = state;
    state = addCompany(state, source, name, jobs, now());
    if (!persist()) {
      state = previous;
      throw new Error(QUOTA);
    }
    render();
  },
});

$("#refresh").onclick = () => refresh(true);

$("#show-filters").onclick = e => {
  const open = $("#filters").classList.toggle("open");
  e.target.setAttribute("aria-expanded", open);
  e.target.textContent = open ? "Hide filters" : "Filters";
};

persist();  // remembers when this visit began
render();
refresh(false);
