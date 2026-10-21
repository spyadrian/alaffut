// The first screen: paste a link, or follow a suggested company in one click.
import { esc } from "../core/safe.js";

export const welcomeHtml = suggestions => `<div class="empty" id="welcome">
  <p>You're not following any company yet. Paste a link to one of its jobs or to its careers page.</p>
  <form class="welcome-form" id="welcome-form">
    <input id="welcome-url" type="url" required placeholder="https://…" aria-label="Link to a job or careers page" autocomplete="off">
    <button class="button">Add</button>
  </form>
  ${suggestions.length ? `<p>Or start with one of these companies:</p>
  <div class="suggestions">${suggestions.map(s => `<button class="suggestion" data-url="${esc(s.url)}" data-name="${esc(s.name)}">${esc(s.name)}</button>`).join("")}</div>` : ""}
  <p id="welcome-status" role="status"></p>
</div>`;

// open(url): the "Add company" dialog, already checking; quick(url, name): adds without asking.
export function setupWelcome(list, { open, quick }) {
  list.addEventListener("submit", e => {
    if (e.target.id !== "welcome-form") return;
    e.preventDefault();
    open(e.target.elements[0].value);
  });
  list.addEventListener("click", async e => {
    const button = e.target.closest(".suggestion");
    if (!button) return;
    const status = list.querySelector("#welcome-status");
    button.disabled = true;
    status.classList.remove("red");
    status.textContent = `Adding ${button.dataset.name}…`;
    try {
      await quick(button.dataset.url, button.dataset.name);  // the job list then replaces this screen
    } catch (error) {
      status.textContent = error.message;
      status.classList.add("red");
      button.disabled = false;
    }
  });
}
