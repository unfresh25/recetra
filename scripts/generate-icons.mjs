// Renders assets/icon.svg into the PNG sizes used by the web manifest and iOS.
// Usage: node scripts/generate-icons.mjs
import { readFile } from "node:fs/promises";
import sharp from "sharp";

const svg = await readFile(new URL("../assets/icon.svg", import.meta.url));
const out = (name) => new URL(`../public/icons/${name}`, import.meta.url).pathname;

await Promise.all([
  sharp(svg).resize(192, 192).png().toFile(out("icon-192.png")),
  sharp(svg).resize(512, 512).png().toFile(out("icon-512.png")),
  // Maskable: full-bleed background so Android can crop to any shape.
  sharp(svg).resize(410, 410).extend({ top: 51, bottom: 51, left: 51, right: 51, background: "#E8202A" }).png().toFile(out("icon-maskable-512.png")),
  sharp(svg).resize(180, 180).flatten({ background: "#E8202A" }).png().toFile(out("apple-touch-icon.png")),
]);
console.log("icons written to public/icons");
