import { describe, expect, it } from "vitest";
import { activeTabForPath } from "./active-tab";

describe("activeTabForPath", () => {
  it.each([
    ["/discover", "/discover"],
    ["/search", "/search"],
    ["/plan", "/plan"],
    ["/shopping", "/plan"],
    ["/shopping/stores", "/plan"],
    ["/shopping/review", "/plan"],
    ["/profile", "/profile"],
    ["/profile/preferences", "/profile"],
    ["/recipes", "/profile"],
    ["/recipes/abc", "/profile"],
    ["/recipes/abc/cook", "/profile"],
    ["/calories", "/profile"],
    ["/calories/history", "/profile"],
    ["/inbox", "/profile"],
    ["/inbox/abc", "/profile"],
    ["/ask", "/profile"],
    ["/recipes/import", null],
    ["/recipes/import/", null],
    ["/recipes/imported-recipe", "/profile"],
    ["/shopping-list", null],
    ["/profile-other", null],
    ["/", null],
  ])("maps %s to %s", (pathname, expected) => {
    expect(activeTabForPath(pathname)).toBe(expected);
  });
});
