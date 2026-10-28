import { createRef, type ComponentProps } from "react";
import { TIKTOK_FRAME } from "@/lib/recipes/cook-video";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CookVideo } from "./cook-video";
import type { StepVideoHandle } from "./step-video";

vi.mock("./timers", () => ({ TimerTray: () => null }));

function renderVideo(overrides: Partial<ComponentProps<typeof CookVideo>> = {}) {
  return renderToStaticMarkup(<CookVideo
    platform="tiktok"
    videoId="123"
    title="Arepas"
    startSeconds={15}
    segmentEnd={30}
    expanded={false}
    hidden={false}
    pipSlotRef={createRef()}
    corner={{ side: "right" }}
    onCornerChange={vi.fn()}
    playerRef={createRef<StepVideoHandle>()}
    timers={{ timers: [], now: 0, add: vi.fn(), play: vi.fn(), pause: vi.fn(), plusMinute: vi.fn(), reset: vi.fn(), remove: vi.fn() }}
    onExpandedChange={vi.fn()}
    onHide={vi.fn()}
    onError={vi.fn()}
    onTime={vi.fn()}
    onIngredients={vi.fn()}
    {...overrides}
  />);
}

function openingTag(markup: string, tag: string, label: string) {
  const match = markup.match(new RegExp(`<${tag}[^>]*aria-label="${label}"[^>]*>`));
  expect(match, label).not.toBeNull();
  return match![0];
}

describe("shared cook video layout", () => {
  it("keeps TikTok at a fixed logical size and makes the entire PiP an expand target", () => {
    const markup = renderVideo();
    expect(markup).toContain('data-native-controls="true"');
    const iframe = markup.match(/<iframe[^>]*>/)?.[0];
    expect(iframe).toContain("https://www.tiktok.com/player/v1/123?");
    expect(iframe).toContain("controls=1");
    expect(iframe).toContain("autoplay=1");
    expect(iframe).toContain("play_button=1");
    expect(iframe).toContain(`width="${TIKTOK_FRAME.width}" height="${TIKTOK_FRAME.height}"`);
    expect(iframe).toContain("pointer-events-none");
    expect(iframe).toContain('tabindex="-1"');
    expect(markup).toContain("cook-player-tiktok");
    expect(markup).toContain(`width:var(--tiktok-width, ${TIKTOK_FRAME.width}px);height:var(--tiktok-height, ${TIKTOK_FRAME.height}px)`);
    expect(markup).toContain('data-tiktok-sizing="pip"');
    expect(markup).not.toContain("cook-video-native-guard");
    const expand = openingTag(markup, "button", "Abrir modo video");
    expect(expand).toContain("inset-0");
    expect(markup).toContain("btn-float absolute top-1 left-1");
    expect(openingTag(markup, "button", "Ocultar video")).toContain("right-1");
  });

  it.each(["youtube", "tiktok"] as const)("keeps only the card, active timers, two action chips and plain close control for %s", (platform) => {
    const markup = renderVideo({ platform, expanded: true });
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain("cook-video-card");
    expect(markup).toContain("cook-video-top-gradient");
    expect(markup).not.toContain('class="cook-video-gradient"');
    expect(markup).toContain("cook-video-overlay");
    expect(markup).toContain("cook-video-timers absolute top-0 left-0");
    expect(markup).not.toContain("cook-video-caption");
    expect(markup).not.toContain('aria-live="polite"');
    expect(markup).not.toContain("cook-tiktok-panel");
    expect(markup).not.toContain("cook-tiktok-topbar");
    expect(markup).not.toContain("Paso 03 de 06");
    expect(markup).not.toContain('aria-label="Paso anterior"');
    expect(markup).not.toContain('aria-label="Siguiente paso"');
    expect(markup).not.toContain("cook-video-progress");
    expect(markup).not.toContain("cook-video-pause-hint");
    const close = openingTag(markup, "button", "Volver a los pasos");
    expect(close).toContain("size-11");
    expect(close).toContain("bg-transparent");
    expect(close).not.toContain("rounded-full");
    expect(close).not.toContain("invisible");
    expect(markup).toContain('href="/ask"');
    expect(markup).toContain("Pregúntale a Carmy");
  });

  it("leaves TikTok's whole video surface interactive to reveal its native bar", () => {
    const markup = renderVideo({ expanded: true });
    expect(markup).toContain('data-tiktok-sizing="video"');
    expect(markup).not.toContain('aria-label="Reproducir video"');
    expect(markup).not.toContain('aria-label="Pausar video"');
    expect(markup).not.toContain("cook-video-progress");
    expect(markup).not.toContain("cook-video-native-guard");
    expect(markup.match(/<iframe[^>]*>/)?.[0]).toContain("pointer-events-auto");
    expect(markup).not.toContain("Toca el video para ver la pausa");
    expect(markup.match(/<iframe[^>]*>/)?.[0]).toContain('tabindex="0"');
  });

  it.each(["youtube", "tiktok"] as const)("renders exactly the ingredients and Carmy chips for %s", (platform) => {
    const markup = renderVideo({ platform, expanded: true });
    const chips = markup.slice(markup.indexOf('<div class="cook-video-chips">'));
    expect(chips.match(/class="cook-video-chip /g)).toHaveLength(2);
    expect(chips.match(/<button /g)).toHaveLength(1);
    expect(chips.match(/<a /g)).toHaveLength(1);
    expect(chips.indexOf("Ingredientes")).toBeLessThan(chips.indexOf("Pregúntale a Carmy"));
    expect(chips).toContain('href="/ask"');
    expect(chips).not.toContain("timer");
  });

  it("keeps TikTok's native URL across view and manual step changes", () => {
    const pip = renderVideo();
    const expanded = renderVideo({ expanded: true, startSeconds: 30, segmentEnd: 45 });
    expect(expanded.match(/<iframe[^>]*src="([^"]*)"/)?.[1]).toBe(pip.match(/<iframe[^>]*src="([^"]*)"/)?.[1]);
    expect(expanded.match(/<iframe/g)).toHaveLength(1);
  });

  it("keeps YouTube's controlled playback overlay and PiP expand target", () => {
    const pip = renderVideo({ platform: "youtube" });
    expect(pip).toContain('data-native-controls="false"');
    expect(openingTag(pip, "button", "Abrir modo video")).toContain("inset-0");
    const expanded = renderVideo({ platform: "youtube", expanded: true });
    expect(expanded).toContain('aria-label="Reproducir video"');
    expect(expanded.match(/aria-label="Reproducir video"/g)).toHaveLength(1);
    expect(expanded).toContain("cook-video-feedback");
    expect(expanded).not.toContain("stroke-dashoffset");
    expect(expanded).not.toContain("cook-video-native-guard");
  });
});
