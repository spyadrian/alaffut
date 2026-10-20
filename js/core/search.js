import { esc } from "./safe.js";

// "Zürich" and "zurich" are the same word to someone typing a search.
const norm = s => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export const terms = query => norm(query).split(/\s+/).filter(Boolean);

// Joined with a newline so a term never matches across two fields.
export const matches = (texts, words) => {
  const text = norm(texts.join("\n"));
  return words.every(w => text.includes(w));
};

// Escapes each character on its own, so a <mark> can never land inside an entity.
export function highlight(text, words) {
  const chars = [...String(text ?? "").normalize("NFC")];
  let flat = "";
  const owner = [];  // for each character of flat, the index in chars it came from
  chars.forEach((c, i) => {
    const n = norm(c);
    flat += n;
    for (let k = 0; k < n.length; k++) owner.push(i);
  });
  const hit = [];
  for (const w of words) {
    for (let i = flat.indexOf(w); i !== -1; i = flat.indexOf(w, i + 1)) {
      for (let k = i; k < i + w.length; k++) hit[owner[k]] = true;
    }
  }
  return chars.map((c, i) => (hit[i] && !hit[i - 1] ? "<mark>" : "") + esc(c) + (hit[i] && !hit[i + 1] ? "</mark>" : "")).join("");
}
