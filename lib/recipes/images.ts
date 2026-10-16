import { env } from "@/lib/env";

/** `recipes/abc.webp` -> `recipes/abc-thumb.webp` */
export function thumbPath(path: string) {
  return path.replace(/\.webp$/, "-thumb.webp");
}

export function recipeImageUrl(path: string | null | undefined, size: "full" | "thumb" = "full") {
  if (!path) return null;
  const objectPath = size === "thumb" ? thumbPath(path) : path;
  return `${env.supabaseUrl}/storage/v1/object/public/recipe-images/${objectPath}`;
}
