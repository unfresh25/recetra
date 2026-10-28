import { afterEach, describe, expect, it, vi } from "vitest";
import { getNavigationStack, previousRecipeDetail, resolveRecipeOrigin, trackNavigation, type NavigationEntry } from "./origin";

function stack(...urls: string[]): NavigationEntry[] {
  return urls.map((url, index) => ({ key: String(index), url, previousKey: index ? String(index - 1) : null }));
}

describe("resolveRecipeOrigin", () => {
  it("returns the screen that opened the detail", () => {
    expect(resolveRecipeOrigin(stack("/recipes", "/recipes/a"), "/recipes/a"))
      .toEqual({ target: "/recipes", steps: 1 });
  });

  it("skips repeated detail and cook-mode/video visits to the same recipe", () => {
    const visits = stack("/discover", "/recipes/a", "/recipes/a/cook", "/recipes/a", "/recipes/a/cook?video=1", "/recipes/a");
    expect(resolveRecipeOrigin(visits, "/recipes/a")).toEqual({ target: "/discover", steps: 5 });
  });

  it("keeps the Más de autor chain: B returns to A, then A to its origin", () => {
    const visits = stack("/discover?author=Ana", "/recipes/a", "/recipes/a/cook", "/recipes/a", "/recipes/b", "/recipes/b/cook", "/recipes/b");
    const fromB = resolveRecipeOrigin(visits, "/recipes/b");
    expect(fromB).toEqual({ target: "/recipes/a", steps: 3 });
    expect(resolveRecipeOrigin(visits.slice(0, -fromB.steps!), "/recipes/a"))
      .toEqual({ target: "/discover?author=Ana", steps: 3 });
  });

  it("preserves the origin query and ignores detail/cook query differences", () => {
    const visits = stack("/plan?day=2026-10-26", "/recipes/a?meal=1", "/recipes/a/cook?meal=1", "/recipes/a?meal=2&servings=4");
    expect(resolveRecipeOrigin(visits, "/recipes/a?meal=2&servings=4"))
      .toEqual({ target: "/plan?day=2026-10-26", steps: 3 });
  });

  it("treats other recipes as origins even when IDs share a prefix", () => {
    expect(resolveRecipeOrigin(stack("/recipes/ab?meal=2", "/recipes/a"), "/recipes/a"))
      .toEqual({ target: "/recipes/ab?meal=2", steps: 1 });
  });

  it("uses a push destination when an unobserved history entry breaks the chain", () => {
    const visits = stack("/discover?q=arroz", "/recipes/a/cook", "/recipes/a");
    visits[1]!.previousKey = null;
    expect(resolveRecipeOrigin(visits, "/recipes/a")).toEqual({ target: "/discover?q=arroz", steps: null });
  });

  it("does not use a history delta when the current URL is missing from the stack", () => {
    expect(resolveRecipeOrigin(stack("/discover", "/recipes/a/cook"), "/recipes/a"))
      .toEqual({ target: "/discover", steps: null });
  });

  it("ignores gaps older than the recipe's origin", () => {
    const visits = stack("/plan", "/discover", "/recipes/a");
    visits[1]!.previousKey = null;
    expect(resolveRecipeOrigin(visits, "/recipes/a")).toEqual({ target: "/discover", steps: 1 });
  });

  it.each(["/recipes/a", "/recipes/a?servings=4"])("falls back to discover for %s", (href) => {
    expect(resolveRecipeOrigin([], href)).toEqual({ target: "/discover", steps: null });
    expect(resolveRecipeOrigin(stack(href, "/recipes/a/cook", href), href))
      .toEqual({ target: "/discover", steps: null });
  });

  it.each(["/recipes/a?meal=1", "/recipes/a?servings=4&meal=", "/recipes/a?meal=abc%2F123"])("falls back to plan for %s", (href) => {
    expect(resolveRecipeOrigin([], href)).toEqual({ target: "/plan", steps: null });
    expect(resolveRecipeOrigin(stack(href), href)).toEqual({ target: "/plan", steps: null });
  });
});

describe("previousRecipeDetail", () => {
  it("recognizes the same recipe detail with any query", () => {
    expect(previousRecipeDetail(stack("/plan", "/recipes/a?meal=1", "/recipes/a/cook?meal=1"), "/recipes/a?meal=1"))
      .toBe("/recipes/a?meal=1");
    expect(previousRecipeDetail(stack("/recipes/a?servings=4", "/recipes/a/cook"), "/recipes/a"))
      .toBe("/recipes/a?servings=4");
  });

  it("requires a consecutive entry for the same detail", () => {
    expect(previousRecipeDetail([], "/recipes/a")).toBeNull();
    expect(previousRecipeDetail(stack("/recipes/a/cook"), "/recipes/a")).toBeNull();
    expect(previousRecipeDetail(stack("/discover", "/recipes/a/cook"), "/recipes/a")).toBeNull();
    expect(previousRecipeDetail(stack("/recipes/b", "/recipes/a/cook"), "/recipes/a")).toBeNull();
    const visits = stack("/recipes/a", "/recipes/a/cook");
    visits[1]!.previousKey = null;
    expect(previousRecipeDetail(visits, "/recipes/a")).toBeNull();
  });
});

// Exercise browser-history bookkeeping without running a browser or e2e suite.
describe("navigation tracker", () => {
  let stop: (() => void) | undefined;
  afterEach(() => { stop?.(); stop = undefined; vi.unstubAllGlobals(); });

  function browser(initialUrl = "/discover") {
    const events = new EventTarget();
    const entries = [{ url: new URL(initialUrl, "https://recetra.test"), state: { __NA: true } as Record<string, unknown> }];
    let index = 0;
    const storage = new Map<string, string>();
    const history = {
      get state() { return entries[index]!.state; },
      pushState(data: Record<string, unknown>, _unused: string, url?: string | URL | null) {
        entries.splice(index + 1);
        entries.push({ state: data, url: new URL(url ?? entries[index]!.url, entries[index]!.url) });
        index++;
      },
      replaceState(data: Record<string, unknown>, _unused: string, url?: string | URL | null) {
        entries[index] = { state: data, url: new URL(url ?? entries[index]!.url, entries[index]!.url) };
      },
      go(delta: number) { index += delta; events.dispatchEvent(new Event("popstate")); },
    };
    vi.stubGlobal("sessionStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) });
    vi.stubGlobal("window", { history, get location() { return entries[index]!.url; }, addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events) });
    stop = trackNavigation();
    return history;
  }

  it("records pushes and query changes, replaces in place, and preserves Next state", () => {
    const history = browser();
    history.pushState({ __NA: true }, "", "/recipes/a?meal=1");
    history.replaceState({ __NA: true, tree: "updated" }, "", "/recipes/a?meal=2");
    history.pushState({ __NA: true }, "", "/recipes/a/cook?meal=2");
    expect(getNavigationStack().map((entry) => entry.url)).toEqual(["/discover", "/recipes/a?meal=2", "/recipes/a/cook?meal=2"]);
    history.go(-1);
    expect(history.state.tree).toBe("updated");
    expect(history.state.__NA).toBe(true);
    expect(resolveRecipeOrigin(getNavigationStack(), "/recipes/a?meal=2")).toEqual({ target: "/discover", steps: 1 });
  });

  it("supports repeated cook exits, back/forward traversal and branching from the detail", () => {
    const history = browser();
    history.pushState({}, "", "/recipes/a");
    history.pushState({}, "", "/recipes/a/cook");
    history.go(-1);
    history.go(1);
    expect(previousRecipeDetail(getNavigationStack(), "/recipes/a")).toBe("/recipes/a");
    history.go(-1);
    history.pushState({}, "", "/recipes/b");
    expect(getNavigationStack().map((entry) => entry.url)).toEqual(["/discover", "/recipes/a", "/recipes/b"]);
    history.go(-1);
    history.pushState({}, "", "/recipes/a/cook");
    history.go(-1);
    expect(resolveRecipeOrigin(getNavigationStack(), "/recipes/a")).toEqual({ target: "/discover", steps: 1 });
  });

  it("restores the active history entry after a reload", () => {
    const history = browser();
    history.pushState({}, "", "/recipes/a");
    history.pushState({}, "", "/recipes/a/cook");
    history.go(-1);
    stop?.();
    stop = trackNavigation();
    expect(resolveRecipeOrigin(getNavigationStack(), "/recipes/a")).toEqual({ target: "/discover", steps: 1 });
  });

  it("keeps a known origin as a push destination across an unobserved navigation", () => {
    const history = browser();
    stop?.();
    history.pushState({}, "", "/recipes/a");
    stop = trackNavigation();
    history.pushState({}, "", "/recipes/a/cook");
    history.go(-1);
    expect(resolveRecipeOrigin(getNavigationStack(), "/recipes/a")).toEqual({ target: "/discover", steps: null });
  });

  it("replaces a direct cook entry with detail without growing history", () => {
    const history = browser("/recipes/a/cook?meal=1");
    expect(previousRecipeDetail(getNavigationStack(), "/recipes/a?meal=1")).toBeNull();
    history.replaceState({}, "", "/recipes/a?meal=1");
    expect(getNavigationStack().map((entry) => entry.url)).toEqual(["/recipes/a?meal=1"]);
    expect(resolveRecipeOrigin(getNavigationStack(), "/recipes/a?meal=1")).toEqual({ target: "/plan", steps: null });
  });

  it("bounds stored history to 30 entries", () => {
    const history = browser();
    for (let i = 0; i < 40; i++) history.pushState({}, "", `/discover?page=${i}`);
    expect(getNavigationStack()).toHaveLength(30);
    expect(getNavigationStack()[0]!.url).toBe("/discover?page=10");
  });

  it("continues in memory when sessionStorage is unavailable", () => {
    const history = browser();
    stop?.();
    vi.stubGlobal("sessionStorage", { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); } });
    stop = trackNavigation();
    history.pushState({}, "", "/recipes/a");
    history.pushState({}, "", "/recipes/a/cook");
    history.go(-1);
    expect(resolveRecipeOrigin(getNavigationStack(), "/recipes/a")).toEqual({ target: "/discover", steps: 1 });
  });
});
