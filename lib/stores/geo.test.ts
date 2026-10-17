import { describe, expect, it } from "vitest";
import { distanceKm, formatDistance, routeUrl } from "./geo";

describe("geo", () => {
  it("measures distances across Barranquilla", () => {
    // Plaza de la Paz to Buenavista mall: about 5 km.
    expect(distanceKm({ lat: 10.9878, lng: -74.7889 }, { lat: 11.0137, lng: -74.8268 })).toBeCloseTo(5.0, 0);
  });

  it("formats meters and kilometers", () => {
    expect(formatDistance(0.43)).toBe("450 m");
    expect(formatDistance(3.26)).toBe("3,3 km");
  });

  it("routes with Apple Maps on iOS", () => {
    expect(routeUrl({ lat: 11, lng: -74.8 }, true)).toContain("maps.apple.com");
    expect(routeUrl({ lat: 11, lng: -74.8 }, false)).toContain("google.com/maps/dir");
  });
});
