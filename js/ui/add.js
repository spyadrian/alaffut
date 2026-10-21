// "Add company": paste a link, or type a name and pick a match → check the source → name it → save.
import { detect, NAMES } from "../core/detect.js";
import { readSource } from "../core/fetch.js";
import { isName, lookup } from "../core/lookup.js";
import { esc } from "../core/safe.js";

const $ = s => document.querySelector(s);
const display = account => account.replace(/[-_]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());

// blocked: the sources nobody may follow. Returns open(url), to start a check, and quick(url, name), to add without asking.
export function setupAdd({ getState, onAdd, blocked }) {
  const dialog = $("#add-dialog"), form = $("#add-form"), link = $("#add-url"), name = $("#add-name");
  const status = $("#add-status"), submit = $("#add-submit"), choices = $("#add-choices"), list = $("#add-choice-list");
  let found = null;  // {source, jobs} once the source has answered
  let matches = [];  // what a name lookup found, until the visitor picks one

  const say = (text, error = false) => { status.textContent = text; status.classList.toggle("red", error); };
  const reset = () => {
    found = null;
    matches = [];
    list.innerHTML = "";  // hidden required radios would block the form
    choices.hidden = $("#add-name-row").hidden = true;
    submit.textContent = "Check";
    say("");
  };
  const showName = value => {
    name.value = value;
    $("#add-name-row").hidden = false;
    submit.textContent = "Add";
  };

  // → {source, jobs, warning?}, or throws a readable error
  async function check(url) {
    const source = detect(url, blocked);
    if (source.error) throw new Error(source.error);
    if (getState().companies.some(c => c.key === `${source.tool}:${source.account}`)) throw new Error("You already follow this company.");
    return { source, ...await readSource(source) };
  }

  $("#add").onclick = () => { form.reset(); reset(); dialog.showModal(); };
  $("#add-cancel").onclick = () => dialog.close();
  link.oninput = reset;
  // homonyms are common, so a name lookup adds nothing until the visitor picks
  list.onchange = e => {
    found = matches[e.target.value];
    say(found.warning ?? "");
    showName(link.value.trim());
  };

  async function search(text) {
    const skip = [...blocked, ...getState().companies.map(c => c.key)];
    matches = await lookup(text, skip);
    if (!matches.length) {
      say("We couldn't find it ourselves. Paste the link to one of its jobs or to its careers page instead.", true);
      return;
    }
    say("");
    list.innerHTML = matches.map(({ source, jobs }, i) => `<label>
      <input type="radio" name="add-choice" value="${i}" required>
      ${source.tool === "rss" ? "Teamtailor" : NAMES[source.tool]} · ${jobs.length} job${jobs.length === 1 ? "" : "s"}
      <a href="${esc(source.page)}" target="_blank" rel="noopener">${esc(source.page.replace("https://", ""))}</a>
    </label>`).join("");
    choices.hidden = false;
    list.querySelector("input").focus();
  }

  form.onsubmit = async e => {
    e.preventDefault();
    if (found) {
      try {
        onAdd(found.source, name.value, found.jobs);
        dialog.close();
      } catch (error) {
        say(error.message, true);
      }
      return;
    }
    submit.disabled = true;
    try {
      if (isName(link.value)) {
        say("Searching…");
        return await search(link.value.trim());
      }
      say("Checking…");
      const { source, jobs, warning } = await check(link.value);
      found = { source, jobs };
      say(`${jobs.length} job${jobs.length === 1 ? "" : "s"} found.${warning ? ` ${warning}` : ""}`);
      showName(source.tool === "rss" ? new URL(source.account).hostname.replace(/^www\./, "") : display(source.account));
      name.select();
    } catch (error) {
      say(error.message, true);
    } finally {
      submit.disabled = false;
    }
  };

  return {
    open(url) {
      form.reset();
      reset();
      link.value = url;
      dialog.showModal();
      form.requestSubmit();
    },
    async quick(url, name) {
      const { source, jobs } = await check(url);
      onAdd(source, name, jobs);
    },
  };
}
