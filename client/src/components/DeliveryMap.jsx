import { useEffect, useRef } from "react";
// maplibre-gl v6 ships named exports only — there is no default export.
import {
  Map as MapLibreMap,
  Marker,
  Popup,
  NavigationControl,
  LngLatBounds,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

/**
 * Delivery map built on MapLibre with OpenStreetMap raster tiles: no API key
 * and no billing, which suits a route line with a handful of markers.
 *
 * The line between origin and destination is drawn straight — it marks the
 * corridor, not the road path. Swapping in a routing provider later only
 * changes the coordinates fed to the same layer.
 */

const OSM_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

const marker = (colour, label) => {
  const el = document.createElement("div");
  el.style.cssText = `
    width:22px;height:22px;border-radius:9999px;background:${colour};
    border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.35);cursor:pointer;
  `;
  el.title = label || "";
  return el;
};

const DeliveryMap = ({ origin, destination, checkpoints = [], lastKnown }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  // Create the map once.
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: OSM_STYLE,
      center: [78.9629, 20.5937], // India
      zoom: 3.5,
      attributionControl: true,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Redraw markers and the corridor whenever the points change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const draw = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const points = [];

      if (origin) {
        markersRef.current.push(
          new Marker({ element: marker("#7a8b6f", "Warehouse") })
            .setLngLat([origin.lng, origin.lat])
            .setPopup(new Popup({ offset: 16 }).setText("Warehouse"))
            .addTo(map),
        );
        points.push([origin.lng, origin.lat]);
      }

      checkpoints
        .filter((c) => c.lat != null && c.lng != null)
        .forEach((c) => {
          markersRef.current.push(
            new Marker({ element: marker("#c56b4a", c.label) })
              .setLngLat([c.lng, c.lat])
              .setPopup(new Popup({ offset: 16 }).setText(c.label))
              .addTo(map),
          );
          points.push([c.lng, c.lat]);
        });

      if (destination) {
        markersRef.current.push(
          new Marker({ element: marker("#3d2e24", "Delivery address") })
            .setLngLat([destination.lng, destination.lat])
            .setPopup(
              new Popup({ offset: 16 }).setText("Delivery address"),
            )
            .addTo(map),
        );
        points.push([destination.lng, destination.lat]);
      }

      // Corridor: warehouse -> confirmed checkpoints -> destination
      const line = {
        type: "Feature",
        geometry: { type: "LineString", coordinates: points },
      };
      if (map.getSource("route")) {
        map.getSource("route").setData(line);
      } else if (points.length > 1) {
        map.addSource("route", { type: "geojson", data: line });
        map.addLayer({
          id: "route",
          type: "line",
          source: "route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#c56b4a",
            "line-width": 3,
            "line-dasharray": [2, 1.5],
            "line-opacity": 0.7,
          },
        });
      }

      if (points.length === 1) {
        map.easeTo({ center: points[0], zoom: 9 });
      } else if (points.length > 1) {
        const bounds = points.reduce(
          (b, p) => b.extend(p),
          new LngLatBounds(points[0], points[0]),
        );
        map.fitBounds(bounds, { padding: 60, maxZoom: 11, duration: 600 });
      }
    };

    if (map.isStyleLoaded()) draw();
    else map.once("load", draw);
  }, [origin, destination, checkpoints, lastKnown]);

  const hasAnyPoint = origin || destination || checkpoints.some((c) => c.lat != null);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="h-72 w-full overflow-hidden rounded-2xl border border-sage/20 sm:h-96"
      />
      {!hasAnyPoint && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/85 text-center">
          <p className="max-w-xs px-6 text-sm text-espresso/50">
            The map appears once the delivery location has been resolved.
          </p>
        </div>
      )}
    </div>
  );
};

export default DeliveryMap;
