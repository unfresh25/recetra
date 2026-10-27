import { describe, expect, it } from "vitest";
import { pipDragX, pipSnapCorner, segmentEnd, stepFromTime } from "./cook-video";

const steps = [0, null, 10, 10, 25, null].map((video_start_seconds) => ({ video_start_seconds }));
describe("stepFromTime", () => {
  it("selects the last matching timed step, including exact boundaries", () => {
    expect(stepFromTime(steps, 0)).toBe(0);
    expect(stepFromTime(steps, 9.99)).toBe(0);
    expect(stepFromTime(steps, 10)).toBe(3);
    expect(stepFromTime(steps, 99)).toBe(4);
    expect(stepFromTime(steps, 5)).toBe(0); // Seeking backward.
  });
  it("keeps the existing step before the first timestamp or when timestamps are missing", () => {
    expect(stepFromTime([{ video_start_seconds: 36 }], 10)).toBeNull();
    expect(stepFromTime([{ video_start_seconds: null }], 10)).toBeNull();
    expect(stepFromTime([], 0)).toBeNull();
    expect(stepFromTime(steps, NaN)).toBeNull();
    expect(stepFromTime(steps, -1)).toBeNull();
    expect(stepFromTime([{ video_start_seconds: 20 }, { video_start_seconds: 5 }], 25)).toBe(0);
  });
});
describe("segmentEnd", () => {
  it("uses the next usable start and leaves untimed/final segments open", () => {
    expect(segmentEnd(steps, 0)).toBe(10);
    expect(segmentEnd(steps, 2)).toBe(25);
    expect(segmentEnd(steps, 3)).toBe(25);
    expect(segmentEnd(steps, 4)).toBeNull();
    expect(segmentEnd(steps, 1)).toBeNull();
    expect(segmentEnd(steps, 20)).toBeNull();
    expect(segmentEnd([10, 4, 20].map((video_start_seconds) => ({ video_start_seconds })), 0)).toBe(20);
  });
});
describe("pipSnapCorner", () => {
  it("snaps according to the player center, including offscreen drags", () => {
    expect(pipSnapCorner(190, 390)).toBe("left");
    expect(pipSnapCorner(195, 390)).toBe("right");
    expect(pipSnapCorner(-10, 390)).toBe("left");
    expect(pipSnapCorner(500, 390)).toBe("right");
  });
});

describe("pipDragX", () => {
  it.each([96, 168])("keeps a %ipx player inside the viewport during a drag", (width) => {
    const left = 390 - width - 16;
    expect(pipDragX(left, -40, width, 390)).toBe(-40);
    expect(left + pipDragX(left, -1000, width, 390)).toBe(0);
    expect(left + pipDragX(left, 1000, width, 390) + width).toBe(390);
  });

  it("clamps against the current viewport after a resize", () => {
    expect(pipDragX(206, 0, 168, 320)).toBe(-54);
    expect(pipDragX(-10, 0, 96, 390)).toBe(10);
  });

  it("preserves fractional movement and the resulting left/right snap", () => {
    const left = 206;
    const width = 168;
    const offset = pipDragX(left, -100.5, width, 390);
    expect(offset).toBe(-100.5);
    expect(pipSnapCorner(left + offset + width / 2, 390)).toBe("left");
    expect(pipSnapCorner(left + width / 2, 390)).toBe("right");
  });
});
