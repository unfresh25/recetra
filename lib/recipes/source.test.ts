import { describe, expect, it } from "vitest";
import { parseRecipeUrl } from "./source";

describe("parseRecipeUrl", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?si=abc", "dQw4w9WgXcQ"],
    ["https://youtube.com/shorts/dQw4w9WgXcQ?feature=share", "dQw4w9WgXcQ"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ])("reads YouTube %s", (input, id) => {
    expect(parseRecipeUrl(input)).toEqual({
      platform: "youtube",
      videoId: id,
      url: `https://www.youtube.com/watch?v=${id}`,
    });
  });

  it("reads full TikTok links and drops tracking params", () => {
    expect(parseRecipeUrl("https://www.tiktok.com/@tatanarroyo/video/7321456789012345678?is_from_webapp=1")).toEqual({
      platform: "tiktok",
      videoId: "7321456789012345678",
      url: "https://www.tiktok.com/@tatanarroyo/video/7321456789012345678",
    });
  });

  it("keeps TikTok short links for later resolution", () => {
    expect(parseRecipeUrl("https://vm.tiktok.com/ZMabc123/")).toEqual({
      platform: "tiktok",
      videoId: null,
      url: "https://vm.tiktok.com/ZMabc123/",
    });
  });

  it.each(["https://www.instagram.com/reel/C9xYz123AbC/?igsh=xyz", "https://instagram.com/p/C9xYz123AbC/"])(
    "reads Instagram %s",
    (input) => {
      expect(parseRecipeUrl(input)).toEqual({
        platform: "instagram",
        videoId: "C9xYz123AbC",
        url: "https://www.instagram.com/reel/C9xYz123AbC/",
      });
    },
  );

  it.each(["", "hola", "ftp://youtube.com/watch?v=dQw4w9WgXcQ", "https://evil.com/watch?v=dQw4w9WgXcQ", "https://www.youtube.com/watch?v=short"])(
    "rejects %s",
    (input) => {
      expect(parseRecipeUrl(input)).toBeNull();
    },
  );
});
