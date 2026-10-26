export type ActiveTab = "/discover" | "/search" | "/plan" | "/profile";

/** Match whole route segments so unrelated paths never select a tab. */
export function activeTabForPath(pathname: string): ActiveTab | null {
  const matches = (route: string) => pathname === route || pathname.startsWith(`${route}/`);

  if (matches("/recipes/import")) return null;
  if (matches("/discover")) return "/discover";
  if (matches("/search")) return "/search";
  if (matches("/plan") || matches("/shopping")) return "/plan";
  if (["/profile", "/recipes", "/calories", "/inbox", "/ask"].some(matches)) return "/profile";
  return null;
}
