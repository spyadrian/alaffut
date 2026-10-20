// Where a job is, as the source spells it. No table of variants: Genève and Geneva stay apart
// until places are matched against a gazetteer such as GeoNames.
import { norm } from "./search.js";

export const NOWHERE = "Not specified";

// Several places are joined with " · " (ours) or ";" (some sources); each is named by what comes before its first comma.
export function cities(location) {
  const names = String(location ?? "").split(/[·;]/).map(place => place.split(",")[0].trim()).filter(Boolean);
  return names.length ? names : [NOWHERE];
}

// Zürich, Zurich and ZURICH are one city in the filter.
export const cityKey = name => norm(name).replace(/\s+/g, " ");
