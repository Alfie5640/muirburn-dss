"use client";

import { useEffect, useRef } from "react";
import type { GeoJSONPolygon } from "../lib/types";

// Static CSS imports are fine at the top level (they don't touch `window`) —
// only the Leaflet *JS* needs to be deferred to a dynamic import inside
// useEffect, since that's what breaks during SSR.
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

// Leaflet touches `window` at import time, so it can only be loaded on the
// client. This component is only ever rendered dynamically with ssr:false
// from page.tsx — don't import it directly anywhere that renders on the server.

export type BurnMapProps = {
  polygon: GeoJSONPolygon | null;
  onPolygonChange: (polygon: GeoJSONPolygon | null) => void;
};

export default function BurnMap({ polygon, onPolygonChange }: BurnMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const drawnItemsRef = useRef<any>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const L = (await import("leaflet")).default;
      await import("leaflet-draw");

      if (cancelled || !containerRef.current || mapRef.current) return;

      // Scotland-wide default view; swap for the user's last site once persistence exists.
      const map = L.map(containerRef.current).setView([56.8, -4.2], 7);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);
      drawnItemsRef.current = drawnItems;

      const drawControl = new (L as any).Control.Draw({
        draw: {
          polygon: { allowIntersection: false, showArea: true },
          polyline: false,
          rectangle: false,
          circle: false,
          circlemarker: false,
          marker: false,
        },
        edit: { featureGroup: drawnItems },
      });
      map.addControl(drawControl);

      const emitPolygon = () => {
        const layers = drawnItems.getLayers();
        if (layers.length === 0) {
          onPolygonChange(null);
          return;
        }
        const geojson = (layers[0] as any).toGeoJSON() as GeoJSONPolygon;
        onPolygonChange(geojson);
      };

      map.on((L as any).Draw.Event.CREATED, (e: any) => {
        // Only one burn site polygon at a time — replace any existing shape.
        drawnItems.clearLayers();
        drawnItems.addLayer(e.layer);
        emitPolygon();
      });
      map.on((L as any).Draw.Event.EDITED, emitPolygon);
      map.on((L as any).Draw.Event.DELETED, emitPolygon);

      mapRef.current = map;

      // The map's height now comes from flexbox (it grows to fill available
      // space), which can change after Leaflet's initial size measurement —
      // e.g. once the assessment form's content finishes laying out. Without
      // this, tiles can render at the old size until the user pans/zooms.
      const resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      if (containerRef.current) resizeObserver.observe(containerRef.current);
      resizeObserverRef.current = resizeObserver;
    }

    init();

    return () => {
      cancelled = true;
      resizeObserverRef.current?.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If the polygon is cleared externally (e.g. a "reset" action), clear the drawn layer too.
  useEffect(() => {
    if (polygon === null && drawnItemsRef.current) {
      drawnItemsRef.current.clearLayers();
    }
  }, [polygon]);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", height: "100%", minHeight: "320px" }}>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
          color: "var(--paper)",
          background: "var(--moor-700)",
          padding: "6px 10px",
          borderRadius: "var(--radius) var(--radius) 0 0",
          flex: "0 0 auto",
        }}
      >
        Draw the proposed burn site boundary
      </div>
      <div
        ref={containerRef}
        style={{
          flex: "1 1 auto",
          minHeight: "320px",
          width: "100%",
          border: "1px solid var(--moor-700)",
          borderRadius: "0 0 var(--radius) var(--radius)",
        }}
      />
      {!polygon && (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--paper-line)", marginTop: "6px", flex: "0 0 auto" }}>
          Use the polygon tool (top right of the map) to mark the burn site before running a check.
        </p>
      )}
    </div>
  );
}