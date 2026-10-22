import { esc } from "./safe.js";

// "Zürich" and "zurich" are the same word to someone typing a search.
export const norm = s => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export const terms = query => norm(query).split(/\s+/).filter(Boolean);

// A title rule matches whole words: padded with spaces, "senior" can't match inside "seniority".
export const wordsOf = text => ` ${norm(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean).join(" ")} `;
export const hasWords = (text, words) => wordsOf(text).includes(words);

// Joined with a newline so a term never matches across two fields.
export const matches = (texts, words) => {
  const text = norm(texts.join("\n"));
  return words.every(w => text.includes(w));
};

// Escapes each character on its own, so a <mark> can never land inside an entity.
// First words (green title rules) are bold, whole words only, like the rules themselves.
export function highlight(text, words, first = []) {
  const chars = [...String(text ?? "").normalize("NFC")];
  let flat = "";
  const owner = [];  // for each character of flat, the index in chars it came from
  chars.forEach((c, i) => {
    const n = norm(c);
    flat += n;
    for (let k = 0; k < n.length; k++) owner.push(i);
  });
  const hit = [], top = [];
  for (const w of words) {
    for (let i = flat.indexOf(w); i !== -1; i = flat.indexOf(w, i + 1)) {
      for (let k = i; k < i + w.length; k++) hit[owner[k]] = true;
    }
  }
  // each word is matched on its own, so the spaces between two marked words are marked too, to read as one
  for (let i = 1; i < chars.length; i++) {
    if (hit[i] || !hit[i - 1]) continue;
    let j = i;
    while (/\s/.test(chars[j] ?? "")) j++;
    if (j > i && hit[j]) for (let k = i; k < j; k++) hit[k] = true;
  }
  for (const rule of first) {
    // after wordsOf, a rule is letters and digits only, so it is safe inside a pattern
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${wordsOf(rule).trim().split(" ").join("[^\\p{L}\\p{N}]+")}(?![\\p{L}\\p{N}])`, "gu");
    for (const m of flat.matchAll(pattern)) for (let k = m.index; k < m.index + m[0].length; k++) top[owner[k]] = true;
  }
  // <strong> always wraps <mark>: a mark is closed and reopened when a bold run starts or ends inside it
  let out = "", bold = false, marked = false;
  chars.forEach((c, i) => {
    if (!!top[i] !== bold) {
      if (marked) out += "</mark>", marked = false;
      out += (bold = !bold) ? '<strong class="first">' : "</strong>";
    }
    if (!!hit[i] !== marked) out += (marked = !marked) ? "<mark>" : "</mark>";
    out += esc(c);
  });
  return out + (marked ? "</mark>" : "") + (bold ? "</strong>" : "");
}
