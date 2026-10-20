// "Add company": paste a link → check the source → name it → save.
import { detect } from "../core/detect.js";
import { readSource } from "../core/fetch.js";

const $ = s => document.querySelector(s);
const display = account => account.replace(/[-_]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());

export function setupAdd({ getState, onAdd }) {
  const dialog = $("#add-dialog"), form = $("#add-form"), link = $("#add-url"), name = $("#add-name");
  const status = $("#add-status"), submit = $("#add-submit");
  let found = null;  // {source, jobs} once the source has answered

  const say = (text, error = false) => { status.textContent = text; status.classList.toggle("red", error); };
  const reset = () => { found = null; $("#add-name-row").hidden = true; submit.textContent = "Check"; say(""); };

  $("#add").onclick = () => { form.reset(); reset(); dialog.showModal(); };
  $("#add-cancel").onclick = () => dialog.close();
  link.oninput = reset;

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
    const source = detect(link.value);
    if (source.error) return say(source.error, true);
    if (getState().companies.some(c => c.key === `${source.tool}:${source.account}`)) return say("You already follow this company.", true);
    submit.disabled = true;
    say("Checking…");
    try {
      const { jobs, warning } = await readSource(source);
      found = { source, jobs };
      say(`${jobs.length} job${jobs.length === 1 ? "" : "s"} found.${warning ? ` ${warning}` : ""}`);
      name.value = source.tool === "rss" ? new URL(source.account).hostname.replace(/^www\./, "") : display(source.account);
      $("#add-name-row").hidden = false;
      submit.textContent = "Add";
      name.select();
    } catch (error) {
      say(error.message, true);
    } finally {
      submit.disabled = false;
    }
  };
}
