// "Export" saves everything followed to a JSON file; "Import" replaces it with such a file, after asking.
import { backup, restore } from "../core/store.js";

const $ = s => document.querySelector(s);
const MAX = 10e6;  // far more than a browser's storage holds

export function setupBackup({ getState, onRestore }) {
  const status = $("#backup-status"), picker = $("#import-file");
  const say = (text, error = false) => { status.textContent = text; status.classList.toggle("red", error); };
  const sizes = s => `${s.companies.length} compan${s.companies.length === 1 ? "y" : "ies"} and ${s.jobs.length} job${s.jobs.length === 1 ? "" : "s"}`;

  $("#export").onclick = () => {
    const now = new Date().toISOString();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([backup(getState(), now)], { type: "application/json" }));
    link.download = `alaffut-backup-${now.slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);  // some browsers start the download after the click returns
    say("Backup saved to your downloads.");
  };

  $("#import").onclick = () => picker.click();
  picker.onchange = async () => {
    const [file] = picker.files;
    picker.value = "";  // choosing the same file again still triggers a change
    if (!file) return;
    try {
      if (file.size > MAX) throw new Error("This file is too large to be a backup from À l'affût.");
      const text = await file.text(), state = getState(), next = restore(state, text);
      if (!confirm(`Replace your ${sizes(state)} with the ${sizes(next)} in this file?`)) return say("");
      onRestore(next);
      say("Backup imported.");
    } catch (error) {
      say(error.message, true);
    }
  };
}
