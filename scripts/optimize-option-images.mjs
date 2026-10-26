// Converts the allergy SVG illustrations into transparent 240x240 WebP files.
// Usage: bun scripts/optimize-option-images.mjs
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const imageDir = new URL("../public/images/allergies/", import.meta.url);

for (const file of (await readdir(imageDir)).sort()) {
  if (!file.endsWith(".svg")) continue;
  const name = file.replace(/\.svg$/, ".webp");
  await sharp(fileURLToPath(new URL(file, imageDir)), { density: 300 })
    .resize(240, 240, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .webp({ quality: 82, effort: 6 })
    .toFile(fileURLToPath(new URL(name, imageDir)));
  console.log("wrote", name);
}
