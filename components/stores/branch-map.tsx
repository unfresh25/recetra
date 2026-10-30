"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { CircleMarker, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import type { Branch, NearbyStore } from "@/lib/stores/queries";

const BARRANQUILLA = { lat: 10.9878, lng: -74.7889 };

function pin(store: NearbyStore) {
  const logo = store.logo_url
    ? `<img src="${store.logo_url}" alt="" style="width:22px;height:22px;object-fit:contain" />`
    : `<span style="font:800 13px system-ui;color:#fff">${store.name.charAt(0)}</span>`;
  return L.divIcon({
    className: "",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    html: `<span style="display:flex;width:34px;height:34px;align-items:center;justify-content:center;border-radius:999px;background:${store.logo_url ? "#fff" : store.brand_color};border:2px solid ${store.brand_color}">${logo}</span>`,
  });
}

function Fit({ points }: { points: { lat: number; lng: number }[] }) {
  const map = useMap();
  useEffect(() => {
    // Keep only the OpenStreetMap credit the tile policy asks for.
    map.attributionControl.setPrefix(false);
  }, [map]);
  useEffect(() => {
    if (points.length === 1) map.setView(points[0]!, 14);
    else if (points.length) map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [24, 24], maxZoom: 15 });
  }, [map, points]);
  return null;
}

export default function BranchMap({
  branches,
  stores,
  here,
  onSelect,
}: {
  branches: Branch[];
  stores: Map<string, NearbyStore>;
  here: { lat: number; lng: number } | null;
  onSelect: (branchId: string) => void;
}) {
  const focus = here ? [here, ...branches.slice(0, 5)] : branches;
  return (
    <MapContainer center={here ?? BARRANQUILLA} zoom={13} zoomControl={false} attributionControl className="h-64 w-full overflow-hidden rounded-3xl">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {branches.map((b) => (
        <Marker key={b.id} position={b} icon={pin(stores.get(b.storeId)!)} eventHandlers={{ click: () => onSelect(b.id) }} title={b.name} />
      ))}
      {here ? <CircleMarker center={here} radius={8} pathOptions={{ color: "#fff", weight: 3, fillColor: "#18181b", fillOpacity: 1 }} /> : null}
      <Fit points={focus} />
    </MapContainer>
  );
}
