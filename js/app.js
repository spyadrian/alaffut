import { load, save, addCompany, renameCompany, removeCompany, dropBlocked, toggleMark, KEY } from "./core/store.js";
import { STATUSES, SORTS, counts, choices, prune } from "./core/filters.js";
import { startVisit, due, merge } from "./core/tracker.js";
import { readAll } from "./core/fetch.js";
import { renderJobs, PAGE } from "./ui/cards.js";
import { terms } from "./core/search.js";
import { renderSummary } from "./ui/summary.js";
import { renderChoices } from "./ui/filters.js";
import { setupAdd } from "./ui/add.js";
import { renderCompanies } from "./ui/companies.js";
import { setupBackup } from "./ui/backup.js";
import { welcomeHtml, setupWelcome } from "./ui/welcome.js";

const $ = s => document.querySelector(s);
const now = () => new Date().toISOString();
const QUOTA = "Your browser refused to save. Free some space in its storage and try again.";
// shortcut: a file that fails to load counts as empty, so its blocked sources are still read until it loads again
const [blocklist, suggestions] = await Promise.all(["blocklist", "suggestions"].map(name =>
  fetch(`data/${name}.json`).then(response => response.json()).catch(() => [])));
let state = dropBlocked(startVisit(load(localStorage), now()), blocklist);
const UI = KEY + ":ui";  // view preferences, kept apart from the data
const view = { status: "open", sort: "spotted", cities: new Set(), companies: new Set() };
let shown = PAGE;  // back to the first jobs whenever the view changes; marks keep it
try {
  const saved = JSON.parse(localStorage.getItem(UI));
  if (Object.hasOwn(STATUSES, saved?.status)) view.status = saved.status;
  if (Object.hasOwn(SORTS, saved?.sort)) view.sort = saved.sort;
} catch {}
const remember = () => { try { localStorage.setItem(UI, JSON.stringify({ status: view.status, sort: view.sort })); } catch {} };

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
  prune(state, view);
  renderSummary(state);
  const total = counts(state);
  for (const button of $("#statuses").children) {
    button.setAttribute("aria-pressed", button.dataset.status === view.status);
    button.lastChild.textContent = total[button.dataset.status];
  }
  $("#list-title").textContent = STATUSES[view.status][0];
  $("#sort").value = view.sort;
  const current = { ...view, words: terms($("#q").value) };
  renderChoices(choices(state, current), view);
  if (!state.companies.length) {
    if (!$("#welcome")) $("#list").innerHTML = welcomeHtml(suggestions);  // keeps what is being typed
    $("#count").textContent = "0 results";
    $("#more").hidden = $("#to-top").hidden = true;
    return;
  }
  const n = renderJobs($("#list"), $("#more"), state, current, shown);
  $("#count").textContent = `${n} result${n === 1 ? "" : "s"}`;
  $("#to-top").hidden = Math.min(shown, n) <= PAGE;
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

const add = setupAdd({
  getState: () => state,
  blocked: blocklist,
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

setupWelcome($("#list"), add);

$("#q").oninput = () => { shown = PAGE; render(); };
$("#q").onkeydown = e => {
  if (e.key !== "Escape") return;
  e.target.value = "";
  shown = PAGE;
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
  view.status = button.dataset.status;
  shown = PAGE;
  remember();
  render();
};

$("#sort").onchange = e => {
  view.sort = e.target.value;
  shown = PAGE;
  remember();
  render();
};

$("#filters").addEventListener("change", e => {
  const chosen = view[e.target.dataset.list];
  if (!chosen) return;
  e.target.checked ? chosen.add(e.target.value) : chosen.delete(e.target.value);
  shown = PAGE;
  render();
  $(`[data-list="${e.target.dataset.list}"][value="${CSS.escape(e.target.value)}"]`)?.focus();  // the list was redrawn
});

$("#filters").addEventListener("click", e => {
  const list = e.target.dataset.clear;
  if (!list) return;
  view[list].clear();
  shown = PAGE;
  render();
});

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

// Renames and removals wait until Save closes the list; Cancel or Esc drops them.
const renaming = new Map(), leaving = new Set();
const dropEdits = () => { renaming.clear(); leaving.clear(); };
function showEdits() {
  const edited = renaming.size + leaving.size > 0;
  $("#companies-cancel").hidden = !edited;
  const close = $("#companies-close");
  close.textContent = edited ? "Save" : "Close";
  close.classList.toggle("button", edited);  // blue, like the other main actions
  close.classList.toggle("more", !edited);
}

$("#companies-open").onclick = () => { renderCompanies(state); showEdits(); $("#companies-dialog").showModal(); };
$("#companies-close").onclick = () => $("#companies-dialog").close();
$("#companies-cancel").onclick = () => { dropEdits(); $("#companies-dialog").close(); };
$("#companies-dialog").addEventListener("cancel", dropEdits);  // Esc

// An empty name, or the current one, is no change.
$("#company-list").addEventListener("input", e => {
  const { key } = e.target.dataset, name = e.target.value.trim();
  if (!name || name === state.companies.find(c => c.key === key).name) renaming.delete(key);
  else renaming.set(key, name);
  showEdits();
});

// Remove only greys a company out, so a second click undoes it.
$("#company-list").addEventListener("click", e => {
  const button = e.target.closest(".remove");
  if (!button) return;
  const { key } = button.dataset, gone = !leaving.delete(key);
  if (gone) leaving.add(key);
  button.closest("li").classList.toggle("leaving", gone);
  button.setAttribute("aria-pressed", gone);
  button.textContent = gone ? "Undo" : "Remove";
  showEdits();
});

$("#companies-dialog").addEventListener("close", () => {
  if (!renaming.size && !leaving.size) return;
  const previous = state;
  for (const [key, name] of renaming) state = renameCompany(state, key, name);
  for (const key of leaving) state = removeCompany(state, key);
  dropEdits();
  const saved = persist();
  if (!saved) state = previous;
  render();
  if (!saved) notSaved();
});

setupBackup({
  getState: () => state,
  onRestore(next) {
    const previous = state;
    state = dropBlocked(next, blocklist);
    if (!persist()) {
      state = previous;
      throw new Error(QUOTA);
    }
    dropEdits();  // the list they referred to is gone
    renderCompanies(state);
    showEdits();
    render();
  },
});

$("#more").onclick = () => {
  const first = shown;
  shown += PAGE;
  render();
  $("#list").children[first]?.querySelector("a[href], button").focus();  // the first new card
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
