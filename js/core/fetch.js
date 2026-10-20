// The one place that talks to job APIs: the browser fetches them directly.
import greenhouse from "./sources/greenhouse.js";
import { lever, leverEu } from "./sources/lever.js";
import ashby from "./sources/ashby.js";
import smartrecruiters from "./sources/smartrecruiters.js";
import rss from "./sources/rss.js";

const SOURCES = { greenhouse, lever, "lever-eu": leverEu, ashby, smartrecruiters, rss };
const TIMEOUT = 15000;

async function request(url, unreachable) {
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
  } catch (error) {
    throw new Error(error?.name === "TimeoutError" ? "The source didn't answer in time." : unreachable);
  }
  if (response.status === 404) throw new Error("Not found at the source. Check the link.");
  if (!response.ok) throw new Error(`The source answered with error ${response.status}.`);
  return response;
}

// Feeds live on any site: when one fails, the browser blocking it (CORS) is likelier than the network.
export async function getText(url) {
  return (await request(url, "The feed couldn't be read: its site is down or doesn't let other websites read it, so the browser blocks it.")).text();
}

export async function getJson(url) {
  const response = await request(url, "The source couldn't be reached.");
  try {
    return await response.json();
  } catch {
    throw new Error("The source sent an unreadable answer.");
  }
}

// → {jobs}, plus a warning when the list is incomplete.
export async function readSource({ tool, account }) {
  const source = SOURCES[tool];
  return source.read ? source.read(account, getJson) : { jobs: source.parse(await (source.text ? getText : getJson)(source.url(account))) };
}

// Read every source, 4 at a time; each answer goes to onResult as {jobs, warning?} or {error}, never a throw.
export async function readAll(sources, onResult, read = readSource) {
  const queue = [...sources];
  const worker = async () => {
    for (let source; (source = queue.shift());) {
      onResult(source, await read(source).catch(error => ({ error: error.message })));
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, queue.length) }, worker));
}
