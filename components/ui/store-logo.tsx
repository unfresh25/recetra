import Image from "next/image";

function isLight(hex: string) {
  const n = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 170;
}

/** Store logo, or a brand-color monogram when we have no sharp logo for it. */
export function StoreLogo({ store, size = 48 }: { store: { name: string; brand_color: string; logo_url: string | null }; size?: number }) {
  if (store.logo_url) {
    return (
      <Image src={store.logo_url} alt="" width={size} height={size} className="object-contain" style={{ width: size, height: size }} />
    );
  }
  return (
    <span
      aria-hidden
      className="flex items-center justify-center rounded-2xl font-display font-extrabold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.46,
        backgroundColor: store.brand_color,
        color: isLight(store.brand_color) ? "#1a1714" : "#ffffff",
      }}
    >
      {store.name.charAt(0)}
    </span>
  );
}
