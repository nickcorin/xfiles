import { Globe2, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MAPBOX_TOKEN } from "@/lib/api";

export function GlobePage({ locations, onOpenRecord }) {
  const mapRef = useRef(null);
  const mapboxRef = useRef(null);
  const containerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current || mapRef.current) return;
    let isMounted = true;
    import("mapbox-gl").then((module) => {
      if (!isMounted || !containerRef.current) return;
      const mapbox = module.default;
      mapbox.accessToken = MAPBOX_TOKEN;
      mapboxRef.current = mapbox;
      mapRef.current = new mapbox.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [-42, 31],
        zoom: 1.35,
        projection: "globe",
      });
      mapRef.current.addControl(new mapbox.NavigationControl({ visualizePitch: true }));
      mapRef.current.on("style.load", () => {
        mapRef.current.setFog({
          color: "rgb(4, 10, 8)",
          "high-color": "rgb(31, 78, 61)",
          "space-color": "rgb(0, 0, 0)",
        });
        setMapReady(true);
      });
    });
    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !mapboxRef.current) return;
    const mapbox = mapboxRef.current;
    const markers = locations.map((location) => {
      const marker = document.createElement("button");
      marker.className = "map-marker";
      marker.title = location.title;
      marker.addEventListener("click", () => onOpenRecord(location.id));
      return new mapbox.Marker(marker)
        .setLngLat([location.longitude, location.latitude])
        .addTo(mapRef.current);
    });
    return () => {
      markers.forEach((marker) => marker.remove());
    };
  }, [locations, mapReady, onOpenRecord]);

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="overflow-hidden rounded-lg border bg-card/70">
        {MAPBOX_TOKEN ? (
          <div className="h-[calc(100vh-15rem)] min-h-[560px] w-full" ref={containerRef} />
        ) : (
          <div className="grid h-[560px] place-items-center text-center text-muted-foreground">
            <div className="flex flex-col items-center gap-3">
              <Globe2 className="size-10" />
              <p>Mapbox token missing.</p>
            </div>
          </div>
        )}
      </div>

      <aside className="rounded-lg border bg-card/70 p-3">
        <div className="flex items-center justify-between gap-3 px-1 pb-3">
          <div>
            <h2 className="font-heading text-lg font-medium">Locations</h2>
            <p className="text-sm text-muted-foreground">{locations.length} mapped records</p>
          </div>
          <Badge variant="secondary">Globe</Badge>
        </div>
        <div className="h-[calc(100vh-19rem)] min-h-[500px] overflow-y-auto pr-3">
          <div className="flex flex-col gap-2">
            {locations.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No geocoded records.
              </p>
            ) : (
              locations.map((location) => (
                <Button
                  key={location.id}
                  className="h-auto justify-start rounded-lg border bg-card p-3 text-left"
                  variant="outline"
                  onClick={() => onOpenRecord(location.id)}
                >
                  <MapPin data-icon="inline-start" />
                  <span className="grid min-w-0 gap-1">
                    <span className="truncate font-medium">{location.incident_location || location.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {location.latitude.toFixed(3)}, {location.longitude.toFixed(3)}
                    </span>
                  </span>
                </Button>
              ))
            )}
          </div>
        </div>
      </aside>
    </section>
  );
}
