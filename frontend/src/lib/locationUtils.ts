import { requestCurrentPosition } from "@/lib/native";

/**
 * Shared location utility for getting the user's current location
 * via browser Geolocation API + Google Maps reverse geocoding.
 *
 * mode: 'full_address' — validates street level, returns full address + coords
 *       'city_only'    — extracts city name only (used by Shop)
 */
export function getCurrentLocationAddress(
  onSuccess: (address: string, city: string, coords: { lat: number; lng: number }, postalCode: string) => void,
  onError: (title: string, description: string) => void,
  onLoadingChange: (loading: boolean) => void,
  mode: 'full_address' | 'city_only' = 'full_address',
  options: { allowApproximateAddress?: boolean; fallbackAddress?: string } = {}
) {
  onLoadingChange(true);

  requestCurrentPosition(
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  ).then(
    (position) => {
      const { latitude, longitude } = position.coords;
      if (!window.google) {
        onLoadingChange(false);
        if (options.allowApproximateAddress && mode === 'full_address') {
          onSuccess(
            options.fallbackAddress || "Current location",
            "",
            { lat: latitude, lng: longitude },
            ""
          );
          return;
        }
        onError("Address Lookup Unavailable", "Enter your address manually to continue.");
        return;
      }

      const geocoder = new google.maps.Geocoder();

      geocoder.geocode(
        { location: { lat: latitude, lng: longitude } },
        (results, status) => {
          onLoadingChange(false);

          if (status === 'OK' && results && results[0]) {
            const place = results[0];
            const components = place.address_components || [];

            if (mode === 'full_address') {
              const hasStreet = components.some((c: any) =>
                c.types.includes("street_number") || c.types.includes("route")
              );
              if (!hasStreet && !options.allowApproximateAddress) {
                onError("Location Too Vague", "Could not determine your exact street address. Please enter it manually.");
                return;
              }
              const cityComp = components.find((c: any) => c.types.includes("postal_town"))
              || components.find((c: any) => c.types.includes("locality"))
              || components.find((c: any) => c.types.includes("administrative_area_level_2"));
              const postalComp = components.find((c: any) => c.types.includes("postal_code"));
              onSuccess(
                place.formatted_address || options.fallbackAddress || "Current location",
                cityComp?.long_name || "",
                { lat: latitude, lng: longitude },
                postalComp?.long_name || ""
              );
            } else {
              // city_only mode
              const cityComp = components.find((c: any) => c.types.includes("postal_town"))
               || components.find((c: any) => c.types.includes("locality"))
               || components.find((c: any) => c.types.includes("administrative_area_level_2"));
              if (!cityComp) {
                onError("Location Too Vague", "Could not determine your city. Please enter it manually.");
                return;
              }
              onSuccess(
                cityComp.long_name,
                cityComp.long_name,
                { lat: latitude, lng: longitude },
                ""
              );
            }
          } else {
            onError("Location Error", "Could not determine your address. Please enter it manually.");
          }
        }
      );
    },
    () => {
      onLoadingChange(false);
      onError("Location Denied", "Please allow location access or enter your address manually.");
    }
  );
}
