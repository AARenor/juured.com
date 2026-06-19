"use client";

import { useEffect, useRef } from "react";
import maplibregl, { Map as MlMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type Props = {
  center: [number, number] | null; // [lng, lat]
  zoom?: number;
};

export default function MapView({ center, zoom = 17 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    // Initial center: Tallinn (will be replaced when search results in)
    const initCenter: [number, number] = center ?? [24.7536, 59.437];

    // MVP basemap: OpenStreetMap (free, XYZ, EPSG:3857).
    // v2 will replace this with Maa-amet orthophoto once we pre-render
    // tiles in EPSG:3301 → EPSG:3857, since Maa-amet's WMS is Lambert-only.
    const osmStyle = {
      version: 8 as const,
      glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
      sources: {
        osm: {
          type: "raster" as const,
          tiles: [
            "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
            "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
            "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
          ],
          tileSize: 256,
          attribution:
            '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxzoom: 19,
        },
      },
      layers: [
        { id: "osm", type: "raster" as const, source: "osm" },
      ],
    };

    const map = new maplibregl.Map({
      container: ref.current,
      style: osmStyle,
      center: initCenter,
      zoom,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fly to new center when it changes
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !center) return;
    m.flyTo({ center, zoom: 17, speed: 1.4, curve: 1.6, essential: true });

    // Drop a marker
    const el = document.createElement("div");
    el.style.cssText =
      "width:22px;height:22px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 0 4px rgba(59,130,246,0.25);";
    const marker = new maplibregl.Marker({ element: el })
      .setLngLat(center)
      .addTo(m);
    return () => {
      marker.remove();
    };
  }, [center]);

  return (
    <div
      ref={ref}
      className="w-full h-full rounded-lg overflow-hidden border border-line"
    />
  );
}
