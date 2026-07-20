"use client";

import { useEffect, useRef } from "react";
import type { RoutePoint } from "@/lib/trip-types";

type RouteMapProps = {
  points: RoutePoint[];
  accent: string;
  title: string;
  disclaimer: string;
};

export function RouteMap({ points, accent, title, disclaimer }: RouteMapProps) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current || points.length < 2) return;
    let disposed = false;
    let cleanup = () => {};

    void import("leaflet").then((module) => {
      if (disposed || !container.current) return;
      const L = module.default;
      const map = L.map(container.current, {
        scrollWheelZoom: false,
        zoomControl: false,
        attributionControl: true,
      });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);
      const coordinates = points.map((point) => [point.lat, point.lng] as [number, number]);
      L.polyline(coordinates, { color: accent, opacity: 0.9, weight: 4 }).addTo(map);
      points.forEach((point, index) => {
        L.circleMarker([point.lat, point.lng], {
          color: "#fff",
          fillColor: accent,
          fillOpacity: 1,
          radius: index === 0 || index === points.length - 1 ? 7 : 5,
          weight: 2,
        }).bindTooltip(`${index + 1}. ${point.label}`, { direction: "top" }).addTo(map);
      });
      map.fitBounds(coordinates, { padding: [24, 24], maxZoom: 8 });
      cleanup = () => map.remove();
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [accent, points]);

  return (
    <section className="route-map-block" aria-label={title}>
      <div className="route-map-heading"><strong>{title}</strong><span>{disclaimer}</span></div>
      <div className="route-map-canvas" ref={container} />
      <ol className="route-stops">
        {points.map((point, index) => <li key={`${point.label}-${index}`}><i style={{ background: accent }} />{point.label}</li>)}
      </ol>
    </section>
  );
}
