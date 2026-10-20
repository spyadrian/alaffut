import { load, save, addCompany, toggleMark, KEY } from "./core/store.js";
import { STATUSES, counts } from "./core/filters.js";
import { startVisit, due, merge } from "./core/tracker.js";
import { readAll } from "./core/fetch.js";
import { renderJobs } from "./ui/cards.js";
import { terms } from "./core/search.js";
import { renderSummary } from "./ui/summary.js";
import { setupAdd } from "./ui/add.js";

const $ = s => document.querySelector(s);
const now = () => new Date().toISOString();
const empty = $("#list").innerHTML;
const QUOTA = "Your browser refused to save. Free some space in its storage and try again.";
let state = startVisit(load(localStorage), now());
const UI = KEY + ":ui";  // view preferences, kept apart from the data
let status = "open";
try {
  const saved = JSON.parse(localStorage.getItem(UI))?.status;
  if (Object.hasOwn(STATUSES, saved)) status = saved;
} catch {}

function persist() {
  try {
    save(localStorage, state);
    return true;
  } catch {
    return false;
  }
}

function notSaved() {
  $("#banners").insertAdjacentHTML("afterbegin", `<div class="banner error" role="alert"><h3>Not saved</h3>${QUOTA}</div>`);
}

function render() {
  renderSummary(state);
  const total = counts(state);
  for (const button of $("#statuses").children) {
    button.setAttribute("aria-pressed", button.dataset.status === status);
    button.lastChild.textContent = total[button.dataset.status];
  }
  $("#list-title").textContent = STATUSES[status][0];
  if (!state.jobs.length) {
    $("#list").innerHTML = empty;
    $("#count").textContent = "0 results";
    return;
  }
  const n = renderJobs($("#list"), state, status, terms($("#q").value));
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
  if (!persist()) notSaved();
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

$("#q").oninput = render;
$("#q").onkeydown = e => {
  if (e.key !== "Escape") return;
  e.target.value = "";
  render();
};
document.addEventListener("keydown", e => {
  if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey || e.target.closest("input, textarea, select, [contenteditable]")) return;
  e.preventDefault();
  $("#q").focus();
});

$("#statuses").onclick = e => {
  const button = e.target.closest("button");
  if (!button) return;
  status = button.dataset.status;
  try { localStorage.setItem(UI, JSON.stringify({ status })); } catch {}
  render();
};

$("#list").onclick = e => {
  const button = e.target.closest(".mark");
  if (!button) return;
  const { key, mark } = button.dataset, previous = state;
  state = toggleMark(state, key, mark, now());
  const saved = persist();
  if (!saved) state = previous;
  render();
  if (!saved) notSaved();
  // keep keyboard users in place when the card stays in the list
  $(`.mark[data-key="${CSS.escape(key)}"][data-mark="${mark}"]`)?.focus();
};

$("#refresh").onclick = () => refresh(true);

$("#show-filters").onclick = e => {
  const open = $("#filters").classList.toggle("open");
  e.target.setAttribute("aria-expanded", open);
  e.target.textContent = open ? "Hide filters" : "Filters";
};

persist();  // remembers when this visit began
render();
refresh(false);
