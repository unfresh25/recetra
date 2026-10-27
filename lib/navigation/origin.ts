export type NavigationEntry = {
  key: string;
  url: string;
  // Null marks a gap in the browser history that this tracker did not observe.
  previousKey: string | null;
};

type Destination = { target: string; steps: number | null };

const storageKey = "recetra.navigation.v1";
const historyKey = "recetraNavigationKey";
const maxEntries = 30;

function pathname(url: string) {
  return url.split(/[?#]/, 1)[0];
}

/** The input ends at the current entry, excluding any forward history. */
export function resolveRecipeOrigin(stack: readonly NavigationEntry[], detailHref: string): Destination {
  const detailPath = pathname(detailHref);
  let consecutive = stack.at(-1)?.url === detailHref;
  for (let index = stack.length - 1; index >= 0; index--) {
    const entry = stack[index]!;
    const path = pathname(entry.url);
    if (path !== detailPath && path !== `${detailPath}/cook`) {
      return { target: entry.url, steps: consecutive ? stack.length - 1 - index : null };
    }
    consecutive &&= index > 0 && entry.previousKey === stack[index - 1]!.key;
  }
  const search = detailHref.split("?", 2)[1]?.split("#", 1)[0];
  return { target: new URLSearchParams(search).has("meal") ? "/plan" : "/discover", steps: null };
}

export function previousRecipeDetail(stack: readonly NavigationEntry[], detailHref: string): string | null {
  const current = stack.at(-1);
  const previous = stack.at(-2);
  return previous && current?.previousKey === previous.key && pathname(previous.url) === pathname(detailHref)
    ? previous.url : null;
}

function readStack(): NavigationEntry[] {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? "[]");
    if (Array.isArray(value) && value.every((entry) => entry && typeof entry.key === "string" && typeof entry.url === "string" && entry.url.startsWith("/") && !entry.url.startsWith("//") && (entry.previousKey === null || typeof entry.previousKey === "string"))) {
      return value.slice(-maxEntries);
    }
  } catch {
    // Storage can be unavailable or contain data from an interrupted session.
  }
  return [];
}

let activeStack: NavigationEntry[] | undefined;

export function getNavigationStack(): NavigationEntry[] {
  const stack = activeStack ?? readStack();
  const index = stack.findIndex((entry) => entry.key === window.history.state?.[historyKey]);
  return index < 0 ? [] : stack.slice(0, index + 1);
}

/** Observe actual history writes so replaces, reloads and traversals keep their meaning. */
export function trackNavigation() {
  const history = window.history;
  const pushState = history.pushState;
  const replaceState = history.replaceState;
  let stack = readStack();
  const currentUrl = () => window.location.pathname + window.location.search;
  const save = () => {
    stack = stack.slice(-maxEntries);
    activeStack = stack;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(stack));
    } catch {
      // Keep tracking in memory when browser storage is disabled.
    }
  };
  const traverse = () => {
    const key = history.state?.[historyKey] ?? crypto.randomUUID();
    if (!stack.some((entry) => entry.key === key)) {
      stack.push({ key, url: currentUrl(), previousKey: null });
    }
    replaceState.call(history, { ...history.state, [historyKey]: key }, "");
    save();
  };

  traverse();
  history.pushState = function (data, unused, url) {
    const previousKey = history.state?.[historyKey] ?? null;
    const index = stack.findIndex((entry) => entry.key === previousKey);
    const key = crypto.randomUUID();
    pushState.call(history, { ...data, [historyKey]: key }, unused, url);
    stack = index < 0 ? stack : stack.slice(0, index + 1);
    stack.push({ key, url: currentUrl(), previousKey });
    save();
  };
  history.replaceState = function (data, unused, url) {
    const key = history.state?.[historyKey];
    replaceState.call(history, { ...data, [historyKey]: key }, unused, url);
    const entry = stack.find((entry) => entry.key === key);
    if (entry) entry.url = currentUrl();
    save();
  };
  window.addEventListener("popstate", traverse);
  return () => {
    history.pushState = pushState;
    history.replaceState = replaceState;
    window.removeEventListener("popstate", traverse);
    activeStack = undefined;
  };
}
