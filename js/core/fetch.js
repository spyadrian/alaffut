// The one place that talks to job APIs: the browser fetches them directly.
import greenhouse from "./sources/greenhouse.js";

const SOURCES = { greenhouse };
const TIMEOUT = 15000;

export async function getJson(url) {
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
  } catch (error) {
    throw new Error(error?.name === "TimeoutError" ? "The source didn't answer in time." : "The source couldn't be reached.");
  }
  if (response.status === 404) throw new Error("Not found at the source. Check the link.");
  if (!response.ok) throw new Error(`The source answered with error ${response.status}.`);
  try {
    return await response.json();
  } catch {
    throw new Error("The source sent an unreadable answer.");
  }
}

export async function readSource({ tool, account }) {
  const source = SOURCES[tool];
  return source.parse(await getJson(source.url(account)));
}

// Read every source, 4 at a time; each answer goes to onResult as {jobs} or {error}, never a throw.
export async function readAll(sources, onResult, read = readSource) {
  const queue = [...sources];
  const worker = async () => {
    for (let source; (source = queue.shift());) {
      onResult(source, await read(source).then(jobs => ({ jobs }), error => ({ error: error.message })));
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, queue.length) }, worker));
}
