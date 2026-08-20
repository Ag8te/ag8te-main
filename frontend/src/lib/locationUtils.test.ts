import { beforeEach, describe, expect, it, vi } from "vitest";

import { requestCurrentPosition } from "@/lib/native";
import { getCurrentLocationAddress } from "@/lib/locationUtils";

vi.mock("@/lib/native", () => ({
  requestCurrentPosition: vi.fn(),
}));

const position = {
  coords: {
    latitude: -33.9249,
    longitude: 18.4241,
  },
} as GeolocationPosition;

describe("getCurrentLocationAddress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Reflect.deleteProperty(window, "google");
    vi.mocked(requestCurrentPosition).mockResolvedValue(position);
  });

  it("returns coordinates when Maps is unavailable and an approximate address is allowed", async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const onLoadingChange = vi.fn();

    getCurrentLocationAddress(
      onSuccess,
      onError,
      onLoadingChange,
      "full_address",
      { allowApproximateAddress: true, fallbackAddress: "Current location" },
    );
    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalled());

    expect(onSuccess).toHaveBeenCalledWith(
      "Current location",
      "",
      { lat: -33.9249, lng: 18.4241 },
      "",
    );
    expect(onError).not.toHaveBeenCalled();
    expect(onLoadingChange.mock.calls).toEqual([[true], [false]]);
  });

  it("asks for manual entry when reverse geocoding is unavailable", async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();

    getCurrentLocationAddress(
      onSuccess,
      onError,
      vi.fn(),
      "full_address",
    );
    await vi.waitFor(() => expect(onError).toHaveBeenCalled());

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      "Address Lookup Unavailable",
      "Enter your address manually to continue.",
    );
  });
});
