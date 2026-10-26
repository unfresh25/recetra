const compactCount = new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 });

export function formatLikeCount(likes: number) {
  if (likes <= 0) return "";
  // ICU versions use either K/k or mil for es-CO; keep the product copy consistent.
  return compactCount.formatToParts(likes).map((part) => {
    if (part.type === "compact" && /^k$/i.test(part.value)) return "mil";
    return part.value.replace(/\s/g, " ");
  }).join("");
}
