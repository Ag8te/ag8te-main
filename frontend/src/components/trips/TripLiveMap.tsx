import { useEffect, useState } from "react";
import { DirectionsRenderer, GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { Loader2, MapPin, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { GOOGLE_MAPS_API_KEY } from "@/lib/googleMaps";

interface TripLiveMapProps {
  currentLocation?: any;
  destination?: any;
  className?: string;
  mapHeightClassName?: string;
  currentLabel?: string;
  destinationLabel?: string;
}

const normalizePoint = (value: any) => {
  if (!value || typeof value !== "object") return null;

  const lat = Number(value.lat);
  const lng = Number(value.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    lat,
    lng,
    address: typeof value.address === "string" ? value.address : "",
    updated_at: typeof value.updated_at === "string" ? value.updated_at : "",
  };
};

export const TripLiveMap = ({
  currentLocation,
  destination,
  className,
  mapHeightClassName = "h-72",
  currentLabel = "Current location",
  destinationLabel = "Destination",
}: TripLiveMapProps) => {
  const origin = normalizePoint(currentLocation);
  const target = normalizePoint(destination);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-live-trip-map-script",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  useEffect(() => {
    if (!isLoaded || !origin || !target || typeof google === "undefined") {
      setDirections(null);
      return;
    }

    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin,
        destination: target,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
          return;
        }
        setDirections(null);
      }
    );
  }, [
    isLoaded,
    origin?.lat,
    origin?.lng,
    target?.lat,
    target?.lng,
  ]);

  const routeLeg = directions?.routes?.[0]?.legs?.[0];

  return (
    <div className={cn("rounded-[2rem] border border-slate-100 bg-white p-4 shadow-sm", className)}>
      <div className={cn("overflow-hidden rounded-[1.5rem] border border-slate-100 bg-slate-100", mapHeightClassName)}>
        {!origin || !target ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm font-medium text-slate-500">
            We&apos;re waiting for live trip coordinates before showing the route map.
          </div>
        ) : loadError ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm font-medium text-rose-500">
            We couldn&apos;t load the trip map right now.
          </div>
        ) : !isLoaded ? (
          <div className="flex h-full items-center justify-center gap-3 text-sm font-medium text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading trip map...
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "100%" }}
            center={origin}
            zoom={13}
            options={{
              disableDefaultUI: true,
              zoomControl: true,
              streetViewControl: false,
              fullscreenControl: false,
              mapTypeControl: false,
              gestureHandling: "greedy",
            }}
          >
            {directions ? (
              <DirectionsRenderer
                directions={directions}
                options={{
                  suppressMarkers: true,
                  polylineOptions: {
                    strokeColor: "#2563EB",
                    strokeOpacity: 0.95,
                    strokeWeight: 5,
                  },
                }}
              />
            ) : null}
            <Marker position={origin} label={{ text: "Now", color: "#0F172A", fontWeight: "700" }} />
            <Marker position={target} label={{ text: "End", color: "#7F1D1D", fontWeight: "700" }} />
          </GoogleMap>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.25rem] border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <Navigation className="mt-0.5 h-4 w-4 text-blue-500" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500">{currentLabel}</p>
              <p className="mt-1 text-sm font-bold text-[#222222]">
                {origin?.address || "Live vehicle position"}
              </p>
              {origin?.updated_at ? (
                <p className="mt-1 text-xs text-slate-500">
                  Updated {new Date(origin.updated_at).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <div className="rounded-[1.25rem] border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-4 w-4 text-rose-500" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-500">{destinationLabel}</p>
              <p className="mt-1 text-sm font-bold text-[#222222]">
                {target?.address || "Dropoff destination"}
              </p>
              {routeLeg ? (
                <p className="mt-1 text-xs text-slate-500">
                  {routeLeg.distance?.text || "Route available"} • {routeLeg.duration?.text || "ETA calculating"}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripLiveMap;
