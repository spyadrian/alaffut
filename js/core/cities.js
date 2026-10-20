// Locations come in every shape ("Zurich, Zurich, CHE", "Zuerich", "Paris · Zurich · Warsaw"):
// bring them back to canonical English city names, one job possibly in several cities.
// A place the table does not know keeps its first part as written ("Uster, ZH" → "Uster").

// canonical name → other spellings, separated by "|" (the canonical name itself always counts)
const VARIANTS = {
  // Switzerland
  "Geneva": "geneve|genf|ginevra", "Zurich": "zuerich|zurigo", "Basel": "bale|basilea", "Bern": "berne|berna",
  "Lausanne": "losanna", "Zug": "zoug|zugo", "Lucerne": "luzern|lucerna", "Lugano": "", "St. Gallen": "saint gall|st gall|sankt gallen",
  "Winterthur": "", "Fribourg": "freiburg im uechtland", "Neuchâtel": "neuenburg", "Biel/Bienne": "biel|bienne",
  "Schaffhausen": "schaffhouse", "Aarau": "", "Chur": "coire", "Sion": "sitten", "Baar": "", "Rotkreuz": "",
  // Europe
  "London": "londres|londra", "Paris": "", "Berlin": "", "Munich": "munchen|muenchen|monaco di baviera", "Hamburg": "hambourg",
  "Frankfurt": "francfort", "Cologne": "koln|koeln", "Düsseldorf": "dusseldorf|duesseldorf", "Stuttgart": "", "Vienna": "wien|vienne",
  "Amsterdam": "", "Rotterdam": "", "The Hague": "den haag|la haye", "Utrecht": "", "Eindhoven": "",
  "Brussels": "bruxelles|brussel", "Antwerp": "antwerpen|anvers", "Luxembourg": "luxemburg", "Dublin": "", "Cork": "",
  "Madrid": "", "Barcelona": "barcelone", "Valencia": "", "Lisbon": "lisboa|lisbonne", "Porto": "",
  "Milan": "milano", "Rome": "roma", "Turin": "torino", "Florence": "firenze", "Naples": "napoli", "Bologna": "bologne",
  "Lyon": "lyons", "Marseille": "marseilles", "Toulouse": "", "Lille": "", "Nantes": "", "Bordeaux": "", "Strasbourg": "strassburg",
  "Grenoble": "", "Nice": "", "Copenhagen": "kobenhavn|copenhague", "Stockholm": "", "Gothenburg": "goteborg", "Oslo": "",
  "Helsinki": "helsingfors", "Warsaw": "warszawa|varsovie", "Krakow": "cracow|cracovie", "Wroclaw": "breslau", "Gdansk": "danzig",
  "Poznan": "", "Prague": "praha|prag", "Brno": "", "Budapest": "", "Bucharest": "bucuresti|bucarest", "Cluj-Napoca": "cluj",
  "Sofia": "", "Athens": "athina|athenes", "Belgrade": "beograd", "Zagreb": "", "Ljubljana": "", "Bratislava": "",
  "Tallinn": "", "Riga": "", "Vilnius": "", "Kyiv": "kiev", "Istanbul": "", "Edinburgh": "edimbourg", "Manchester": "",
  "Cambridge": "", "Oxford": "", "Bristol": "", "Belfast": "", "Glasgow": "", "Leeds": "", "Reykjavik": "", "Tel Aviv": "tel aviv yafo",
  // Elsewhere
  "New York": "nyc|new york city", "San Francisco": "", "Los Angeles": "", "Seattle": "", "Boston": "", "Chicago": "",
  "Palo Alto": "", "Mountain View": "", "Menlo Park": "", "San Jose": "", "San Diego": "", "Redmond": "",
  "Austin": "", "Denver": "", "Atlanta": "", "Miami": "", "Washington, D.C.": "washington dc", "Toronto": "",
  "Montreal": "", "Vancouver": "", "Mexico City": "ciudad de mexico|cdmx", "São Paulo": "sao paulo", "Buenos Aires": "",
  "Bogotá": "bogota", "Santiago": "", "Singapore": "singapour", "Hong Kong": "", "Tokyo": "", "Seoul": "", "Beijing": "peking",
  "Shanghai": "", "Shenzhen": "", "Taipei": "", "Bangalore": "bengaluru", "Mumbai": "bombay", "Delhi": "new delhi",
  "Hyderabad": "", "Pune": "", "Chennai": "", "Gurgaon": "gurugram", "Sydney": "", "Melbourne": "", "Auckland": "",
  "Dubai": "", "Abu Dhabi": "", "Cape Town": "", "Johannesburg": "", "Lagos": "", "Nairobi": "", "Cairo": "",
  // Not a city, but where many jobs are
  "Remote": "fully remote|work from home|home office|homeoffice|teletravail|telework",
};

export const NOWHERE = "Not specified";

// Lower case, no accents, letters NFD cannot split (ø, ł, ß…) spelled out, any punctuation a space.
const LETTERS = { ø: "o", æ: "ae", œ: "oe", ß: "ss", ł: "l", đ: "d", ı: "i" };
const norm = s => ` ${s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[øæœßłđı]/g, c => LETTERS[c]).replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;

const TABLE = Object.entries(VARIANTS).map(([city, others]) =>
  [city, [city, ...others.split("|").filter(Boolean)].map(norm)]);

const known = text => TABLE.map(([city, variants]) => [city, Math.min(...variants.map(v => text.indexOf(v)).filter(i => i >= 0))])
  .filter(([, at]) => at !== Infinity).sort((a, b) => a[1] - b[1]).map(([city]) => city);

const seen = new Map();  // the same few locations come back on every render

// Sources join several places with " · " (some with ";"); each place gives its cities or its first part.
export function cities(location) {
  if (!seen.has(location)) {
    const places = String(location ?? "").split(/[·;]/).map(place => place.trim()).filter(Boolean);
    const found = new Set(places.flatMap(place => {
      const named = known(norm(place));
      return named.length ? named : [place.split(",")[0].trim()];
    }));
    seen.set(location, found.size ? [...found] : [NOWHERE]);
  }
  return seen.get(location);
}
