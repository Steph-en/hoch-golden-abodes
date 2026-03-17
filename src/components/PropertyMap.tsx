import { useRef, useEffect, useState } from "react";
import { properties } from "@/data/properties";
import { MapPin, X, Bed, Bath, Square } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

// Coordinates for Ghana locations
const locationCoords: Record<string, [number, number]> = {
  "East Legon": [-0.1685, 5.6320],
  "Airport Residential": [-0.1742, 5.6052],
  "Cantonments": [-0.1780, 5.5782],
  "Cape Coast": [-1.2466, 5.1036],
  "Osu": [-0.1857, 5.5559],
  "Ridge": [-0.1936, 5.5660],
};

const MAPBOX_STYLE = "mapbox://styles/mapbox/dark-v11";

const PropertyMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [selectedProperty, setSelectedProperty] = useState<typeof properties[0] | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>("");
  const [mapLoaded, setMapLoaded] = useState(false);

  // Use a demo/public token approach - in production, use your own token
  useEffect(() => {
    // Check if mapbox-gl can be loaded
    const token = import.meta.env.VITE_MAPBOX_TOKEN || "pk.eyJ1IjoibG92YWJsZS1kZW1vIiwiYSI6ImNtYnVuMGZhbzByZmQyanF6aTl3M2RhYnEifQ.demo";
    setMapboxToken(token);
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || mapLoaded) return;

    let isMounted = true;

    const initMap = async () => {
      try {
        const mapboxgl = (await import("mapbox-gl")).default;
        await import("mapbox-gl/dist/mapbox-gl.css");

        if (!isMounted || !mapContainer.current) return;

        (mapboxgl as any).accessToken = mapboxToken;

        const map = new mapboxgl.Map({
          container: mapContainer.current,
          style: MAPBOX_STYLE,
          center: [-0.187, 5.603],
          zoom: 11,
          pitch: 45,
          bearing: -15,
        });

        mapRef.current = map;

        map.on("load", () => {
          if (!isMounted) return;
          setMapLoaded(true);

          // Add property markers
          properties.forEach((property) => {
            const coords = locationCoords[property.area];
            if (!coords) return;

            // Add slight offset for properties in same area
            const offset = (property.id % 3) * 0.003;
            const [lng, lat] = [coords[0] + offset, coords[1] + offset];

            // Create custom marker element
            const el = document.createElement("div");
            el.className = "property-marker";
            el.style.cssText = `
              width: 36px; height: 36px; border-radius: 50%;
              background: linear-gradient(135deg, hsl(38 45% 58%), hsl(42 50% 65%));
              border: 3px solid white; cursor: pointer;
              display: flex; align-items: center; justify-content: center;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              transition: transform 0.2s;
            `;
            el.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
            el.addEventListener("mouseenter", () => { el.style.transform = "scale(1.2)"; });
            el.addEventListener("mouseleave", () => { el.style.transform = "scale(1)"; });
            el.addEventListener("click", () => {
              setSelectedProperty(property);
              map.flyTo({ center: [lng, lat], zoom: 14, duration: 1000 });
            });

            new mapboxgl.Marker(el).setLngLat([lng, lat]).addTo(map);
          });

          // Navigation control
          map.addControl(new mapboxgl.NavigationControl(), "top-right");
        });
      } catch (err) {
        console.warn("Mapbox failed to load:", err);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      mapRef.current?.remove();
    };
  }, [mapboxToken]);

  return (
    <div className="relative w-full h-[500px] rounded-2xl overflow-hidden border border-border">
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Fallback if no token */}
      {!mapboxToken && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Map requires a Mapbox token</p>
          </div>
        </div>
      )}

      {/* Selected property popup */}
      {selectedProperty && (
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-10">
          <div className="bg-card rounded-xl shadow-xl border border-border overflow-hidden">
            <div className="relative">
              <img
                src={selectedProperty.image}
                alt={selectedProperty.title}
                className="w-full h-40 object-cover"
              />
              <button
                onClick={() => setSelectedProperty(null)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                {selectedProperty.price}
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-foreground mb-1">{selectedProperty.title}</h3>
              <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {selectedProperty.location}
              </p>
              {selectedProperty.beds > 0 && (
                <div className="flex gap-3 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1"><Bed className="w-3 h-3" />{selectedProperty.beds}</span>
                  <span className="flex items-center gap-1"><Bath className="w-3 h-3" />{selectedProperty.baths}</span>
                  <span className="flex items-center gap-1"><Square className="w-3 h-3" />{selectedProperty.sqft}</span>
                </div>
              )}
              <Link to={`/property/${selectedProperty.id}`}>
                <Button size="sm" className="w-full btn-primary">View Property</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyMap;
