import { afterEach, describe, expect, it, vi } from "vitest";
import { CookPlayerController, pipDragX, pipSnapCorner, segmentEnd, segmentProgress, stepFromTime, tiktokPlayerUrl, videoRingFraction, videoSwipeDirection, type PlayerCommand } from "./cook-video";

afterEach(() => { vi.useRealTimers(); });

describe("segmentProgress", () => {
  it.each([
    [10, 0], [15, 0], [20, 0.25], [25, 0.5], [35, 1], [40, 1],
  ])("clamps playback at %ss within a 15–35s segment to %s", (seconds, fraction) => {
    expect(segmentProgress(seconds, 15, 35)).toBe(fraction);
  });

  it.each([
    [null, 15, 35], [20, null, 35], [20, 15, null], [20, 15, 15],
    [20, 35, 15], [20, -1, 35], [NaN, 15, 35], [20, Infinity, 35], [20, 15, Infinity],
  ])("does not invent progress for an unavailable or invalid segment (%s, %s, %s)", (seconds, start, end) => {
    expect(segmentProgress(seconds, start, end)).toBe(0);
  });
});

describe("videoRingFraction", () => {
  const input = { platform: "youtube", seconds: 20, startSeconds: 15, endSeconds: 35, stepIndex: 2, stepCount: 6 };

  it("uses segment playback for YouTube, independently of step count", () => {
    expect(videoRingFraction(input)).toBe(0.25);
    expect(videoRingFraction({ ...input, stepIndex: 5 })).toBe(0.25);
    expect(videoRingFraction({ ...input, seconds: null })).toBe(0);
    expect(videoRingFraction({ ...input, endSeconds: null })).toBe(0);
  });

  it("uses step progress for TikTok without timestamps or player events", () => {
    const tiktok = { ...input, platform: "tiktok", seconds: null, startSeconds: null, endSeconds: null };
    expect(videoRingFraction({ ...tiktok, stepIndex: 0 })).toBeCloseTo(1 / 6);
    expect(videoRingFraction(tiktok)).toBe(0.5);
    expect(videoRingFraction({ ...tiktok, stepIndex: 5 })).toBe(1);
    expect(videoRingFraction({ ...tiktok, stepIndex: 1 })).toBeCloseTo(2 / 6);
  });

  it.each([
    [-2, 6, 0], [8, 6, 1], [0, 0, 0], [0, -1, 0], [NaN, 6, 0], [0, Infinity, 0],
  ])("bounds step progress safely (%s / %s)", (stepIndex, stepCount, fraction) => {
    expect(videoRingFraction({ ...input, platform: "tiktok", stepIndex, stepCount })).toBe(fraction);
  });
});

describe("videoSwipeDirection", () => {
  const start = { x: 100, y: 200 };
  it("advances on left swipes and goes back on right swipes", () => {
    expect(videoSwipeDirection(start, { x: 40, y: 205 })).toBe("next");
    expect(videoSwipeDirection(start, { x: 160, y: 195 })).toBe("previous");
  });

  it.each([
    [100, 200], [41, 200], [159, 200], [105, 60], [95, 340], [160, 250], [NaN, 200], [100, Infinity],
  ])("ignores taps, short drags, vertical scrolls and ambiguous diagonals (%s, %s)", (x, y) => {
    expect(videoSwipeDirection(start, { x, y })).toBeNull();
  });
});

function playerHarness() {
  vi.useFakeTimers();
  const send = vi.fn<(command: PlayerCommand) => void>();
  const onPlayingChange = vi.fn();
  const onFallback = vi.fn();
  const controller = new CookPlayerController({ send, onPlayingChange, onFallback });
  return { controller, send, onPlayingChange, onFallback };
}

describe("CookPlayerController (YouTube)", () => {
  it.each(["load-first", "ready-first"])("queues every command until both load and player ready (%s)", (order) => {
    const { controller, send } = playerHarness();
    const commands: PlayerCommand[] = [{ type: "play" }, { type: "pause" }, { type: "mute" }, { type: "unMute" }, { type: "seekTo", value: 42 }];
    commands.forEach((command) => controller.command(command));
    expect(send).not.toHaveBeenCalled();
    if (order === "load-first") controller.loaded();
    else controller.playerReady();
    expect(send).not.toHaveBeenCalled();
    if (order === "load-first") controller.playerReady();
    else controller.loaded();
    expect(send.mock.calls.map(([command]) => command)).toEqual(commands);
    controller.playerReady();
    controller.loaded();
    expect(send).toHaveBeenCalledTimes(commands.length);
  });

  it("reports playback only from events; buffering never confirms a play command", () => {
    const { controller, onPlayingChange, onFallback } = playerHarness();
    controller.loaded();
    controller.playerReady();
    controller.command({ type: "play" });
    expect(onPlayingChange).not.toHaveBeenCalled();
    expect(controller.playing).toBe(false);
    controller.stateChanged(3);
    expect(controller.playing).toBe(false);
    vi.advanceTimersByTime(1_999);
    expect(onFallback).not.toHaveBeenCalled();
    controller.stateChanged(1);
    expect(onPlayingChange).toHaveBeenLastCalledWith(true);
    vi.advanceTimersByTime(5_000);
    expect(onFallback).not.toHaveBeenCalled();
    controller.command({ type: "pause" });
    expect(controller.playing).toBe(true);
    controller.stateChanged(2);
    expect(onPlayingChange).toHaveBeenLastCalledWith(false);
    controller.stateChanged(1);
    controller.stateChanged(0);
    expect(controller.playing).toBe(false);
  });

  it("falls back after 2s without playing, even if repeated taps send more play commands", () => {
    const { controller, onFallback } = playerHarness();
    controller.loaded();
    controller.playerReady();
    controller.command({ type: "play" });
    vi.advanceTimersByTime(1_000);
    controller.command({ type: "play" });
    controller.stateChanged(2);
    vi.advanceTimersByTime(1_000);
    expect(onFallback).toHaveBeenCalledTimes(1);
  });

  it("starts the play deadline when the queued play is sent, not when tapped", () => {
    const { controller, onFallback } = playerHarness();
    controller.command({ type: "play" });
    vi.advanceTimersByTime(3_000);
    expect(onFallback).not.toHaveBeenCalled();
    controller.loaded();
    controller.playerReady();
    vi.advanceTimersByTime(1_999);
    expect(onFallback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onFallback).toHaveBeenCalledTimes(1);
  });

  it.each(["no-events", "load-only", "ready-only"])("falls back once at 5s without full readiness (%s)", (event) => {
    const { controller, onFallback, send } = playerHarness();
    controller.command({ type: "play" });
    if (event === "load-only") controller.loaded();
    if (event === "ready-only") controller.playerReady();
    vi.advanceTimersByTime(4_999);
    expect(onFallback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onFallback).toHaveBeenCalledTimes(1);
    expect(send).not.toHaveBeenCalled();
    controller.loaded();
    controller.playerReady();
    // The failed play must not restart playback over the native controls.
    expect(send).not.toHaveBeenCalled();
    controller.command({ type: "play" });
    vi.advanceTimersByTime(10_000);
    expect(onFallback).toHaveBeenCalledTimes(1);
  });

  it("waits for the reloaded fallback frame before sending further commands", () => {
    const { controller, send, onFallback } = playerHarness();
    controller.loaded();
    controller.playerReady();
    controller.fallback();
    controller.command({ type: "pause" });
    expect(send).not.toHaveBeenCalled();
    controller.loaded();
    expect(send).not.toHaveBeenCalled();
    controller.playerReady();
    expect(send).toHaveBeenCalledExactlyOnceWith({ type: "pause" });
    controller.fallback();
    expect(onFallback).toHaveBeenCalledTimes(1);
  });

  it("cancels the play deadline when pause is requested", () => {
    const { controller, onFallback } = playerHarness();
    controller.loaded();
    controller.playerReady();
    controller.command({ type: "play" });
    vi.advanceTimersByTime(1_000);
    controller.command({ type: "pause" });
    vi.advanceTimersByTime(6_000);
    expect(onFallback).not.toHaveBeenCalled();
  });

  it("disposes timers, commands and late events on teardown", () => {
    const { controller, onFallback, onPlayingChange, send } = playerHarness();
    controller.command({ type: "play" });
    controller.dispose();
    controller.loaded();
    controller.playerReady();
    controller.stateChanged(1);
    controller.command({ type: "play" });
    vi.advanceTimersByTime(10_000);
    expect(send).not.toHaveBeenCalled();
    expect(onFallback).not.toHaveBeenCalled();
    expect(onPlayingChange).not.toHaveBeenCalled();
  });

  it("cancels an outstanding play acknowledgement on teardown", () => {
    const { controller, onFallback } = playerHarness();
    controller.loaded();
    controller.playerReady();
    controller.command({ type: "play" });
    controller.dispose();
    vi.advanceTimersByTime(10_000);
    expect(onFallback).not.toHaveBeenCalled();
  });

  it("retains native mode across effect restarts without another fallback reload", () => {
    vi.useFakeTimers();
    const onFallback = vi.fn();
    const send = vi.fn();
    const controller = new CookPlayerController({ send, onFallback, onPlayingChange: vi.fn() }, true);
    controller.command({ type: "play" });
    vi.advanceTimersByTime(5_000);
    expect(onFallback).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    controller.loaded();
    controller.playerReady();
    expect(send).toHaveBeenCalledExactlyOnceWith({ type: "play" });
    vi.advanceTimersByTime(5_000);
    expect(onFallback).not.toHaveBeenCalled();
    controller.dispose();
  });
});

describe("tiktokPlayerUrl", () => {
  it("hides chrome, retains center play and requests autoplay and looping in cook mode", () => {
    const url = new URL(tiktokPlayerUrl("123"));
    expect(url.origin + url.pathname).toBe("https://www.tiktok.com/player/v1/123");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      controls: "0", progress_bar: "0", volume_control: "0", fullscreen_button: "0",
      timestamp: "0", music_info: "0", description: "0", rel: "0", closed_caption_button: "0",
      play_button: "1", loop: "1", autoplay: "1",
    });
  });

  it("preserves the recipe hero's full controls and non-looping playback", () => {
    const url = new URL(tiktokPlayerUrl("123", { autoplay: true, loop: false, controls: true }));
    for (const key of ["controls", "play_button", "progress_bar", "volume_control", "fullscreen_button", "timestamp", "autoplay"]) {
      expect(url.searchParams.get(key)).toBe("1");
    }
    expect(url.searchParams.get("loop")).toBe("0");
    expect(new URL(tiktokPlayerUrl("123", { autoplay: false })).searchParams.get("autoplay")).toBe("0");
  });
});

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
