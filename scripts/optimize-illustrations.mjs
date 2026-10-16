// Converts the raw PNGs in public/illustrations/raw into small WebP files.
// Usage: node scripts/optimize-illustrations.mjs
import { readdir } from "node:fs/promises";
import sharp from "sharp";

const rawDir = new URL("../public/illustrations/raw/", import.meta.url);
const outDir = new URL("../public/illustrations/", import.meta.url);

for (const file of await readdir(rawDir)) {
  if (!file.endsWith(".png")) continue;
  const name = file.replace(/\.png$/, ".webp");
  await sharp(new URL(file, rawDir).pathname)
    .trim({ threshold: 1 })
    .resize(480, 480, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 82, alphaQuality: 90, effort: 6 })
    .toFile(new URL(name, outDir).pathname);
  console.log("wrote", name);
}
