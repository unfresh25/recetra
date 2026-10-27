import { afterEach, describe, expect, it, vi } from "vitest";
import { CookPlayerController, pipDragX, pipSnapCorner, segmentEnd, stepFromTime, tiktokPlayerUrl, type PlayerCommand } from "./cook-video";

afterEach(() => { vi.useRealTimers(); });

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
  it("exposes native controls from the start of cook mode", () => {
    const url = new URL(tiktokPlayerUrl("123"));
    expect(url.origin + url.pathname).toBe("https://www.tiktok.com/player/v1/123");
    expect(url.searchParams.get("autoplay")).toBe("0");
    for (const key of ["controls", "play_button", "progress_bar", "volume_control", "fullscreen_button", "timestamp"]) {
      expect(url.searchParams.get(key)).toBe("1");
    }
    for (const key of ["music_info", "description", "rel"]) {
      expect(url.searchParams.get(key)).toBe("0");
    }
    expect(url.searchParams.has("muted")).toBe(false);
  });

  it("preserves native controls with the recipe hero's autoplay and loop options", () => {
    const url = new URL(tiktokPlayerUrl("123", { autoplay: true, loop: false }));
    for (const key of ["controls", "play_button", "progress_bar", "volume_control", "fullscreen_button", "timestamp", "autoplay"]) {
      expect(url.searchParams.get(key)).toBe("1");
    }
    expect(url.searchParams.get("loop")).toBe("0");
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
