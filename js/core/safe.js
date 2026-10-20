// Data from job APIs comes from third parties: escape it before it touches HTML,
// and only ever link to https: addresses.

const ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ENTITIES[c]);

export function safeUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
