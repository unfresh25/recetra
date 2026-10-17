import { describe, expect, it } from "vitest";
import { chainOf } from "./osm";

describe("chainOf", () => {
  it.each([
    [{ brand: "Olímpica" }, "olimpica"],
    [{ name: "Super Almacén Olimpica" }, "olimpica"],
    [{ name: "Tiendas D1" }, "d1"],
    [{ name: "D1" }, "d1"],
    [{ brand: "Ara" }, "ara"],
    [{ name: "Éxito Panorama" }, "exito"],
    [{ name: "Mega Tiendas" }, "megatiendas"],
    [{ name: "Jumbo (Cencosud)" }, "jumbo"],
  ])("%o -> %s", (tags, slug) => {
    expect(chainOf(tags as Record<string, string>)).toBe(slug);
  });

  it("ignores neighborhood shops", () => {
    expect(chainOf({ name: "Tienda La Bendición de Dios" })).toBeNull();
    expect(chainOf({ name: "Paradero Marsol" })).toBeNull();
  });
});
