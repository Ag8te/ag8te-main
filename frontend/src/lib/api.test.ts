import { describe, expect, it } from "vitest";

import { getImageUrl } from "@/lib/api";

describe("getImageUrl", () => {
    it("forces Unsplash images to use JPEG", () => {
        const imageUrl = getImageUrl(
            "https://images.unsplash.com/photo-123?auto=format&fit=crop&w=800"
        );
        const parsedUrl = new URL(imageUrl);

        expect(parsedUrl.searchParams.get("fm")).toBe("jpg");
        expect(parsedUrl.searchParams.has("auto")).toBe(false);
        expect(parsedUrl.searchParams.get("fit")).toBe("crop");
        expect(parsedUrl.searchParams.get("w")).toBe("800");
    });

    it("leaves other external image URLs unchanged", () => {
        const imageUrl = "https://cdn.example.com/photo.avif?width=800";

        expect(getImageUrl(imageUrl)).toBe(imageUrl);
    });
});
