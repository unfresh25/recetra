import { createRef, type ComponentProps } from "react";
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
    tokens={[{ kind: "text", text: "Mezcla la masa." }]}
    stepIndex={2}
    stepCount={6}
    onPreviousStep={vi.fn()}
    onNextStep={vi.fn()}
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
    onTimer={vi.fn()}
    {...overrides}
  />);
}

function openingTag(markup: string, tag: string, label: string) {
  const match = markup.match(new RegExp(`<${tag}[^>]*aria-label="${label}"[^>]*>`));
  expect(match, label).not.toBeNull();
  return match![0];
}

describe("shared cook video layout", () => {
  it("keeps TikTok's center player interactive and the PiP expand target separate", () => {
    const markup = renderVideo();
    expect(markup).toContain('data-native-controls="true"');
    const iframe = markup.match(/<iframe[^>]*>/)?.[0];
    expect(iframe).toContain("https://www.tiktok.com/player/v1/123?");
    expect(iframe).toContain("controls=0");
    expect(iframe).toContain("autoplay=1");
    expect(iframe).toContain("play_button=1");
    expect(iframe).toContain("pointer-events-auto");
    expect(iframe).not.toContain('tabindex="-1"');
    expect(markup).toContain("cook-video-native-guard");
    const expand = openingTag(markup, "button", "Abrir modo video");
    expect(expand).toContain("size-7");
    expect(expand).toContain("top-1 left-1");
    expect(expand).not.toContain("inset-0");
    expect(openingTag(markup, "button", "Ocultar video")).toContain("right-1");
  });

  it.each(["youtube", "tiktok"] as const)("shares the card, caption, chips and plain close control for %s", (platform) => {
    const markup = renderVideo({ platform, expanded: true });
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain("cook-video-card");
    expect(markup).toContain("cook-video-gradient");
    expect(markup).toContain("cook-video-overlay");
    expect(markup).toContain("Mezcla la masa.");
    expect(markup).not.toContain("cook-tiktok-panel");
    expect(markup).not.toContain("cook-tiktok-topbar");
    expect(markup).not.toContain("Paso 03 de 06");
    expect(markup).not.toContain('aria-label="Paso anterior"');
    const close = openingTag(markup, "button", "Volver a los pasos");
    expect(close).toContain("size-11");
    expect(close).toContain("bg-transparent");
    expect(close).not.toContain("rounded-full");
    expect(close).not.toContain("invisible");
    expect(markup).toContain('href="/ask"');
    expect(markup).toContain("Pregúntale a Carmy");
  });

  it("uses step progress for TikTok and leaves native playback accessible without a tap overlay", () => {
    const markup = renderVideo({ expanded: true });
    expect(markup).not.toContain('aria-label="Reproducir video"');
    expect(markup).not.toContain('aria-label="Pausar video"');
    expect(markup).toContain('stroke-dashoffset="0.5"');
    expect(renderVideo({ expanded: true, stepIndex: 0 })).toContain(`stroke-dashoffset="${1 - 1 / 6}"`);
    const last = renderVideo({ expanded: true, stepIndex: 5 });
    expect(last).toContain('stroke-dashoffset="0"');
    expect(openingTag(last, "button", "Siguiente paso")).not.toContain("disabled");
  });

  it("makes the ring the first chip and uses the upper bound for timer ranges", () => {
    const markup = renderVideo({ expanded: true, tokens: [
      { kind: "text", text: "Cocina " }, { kind: "time", text: "5 a 10 minutos", seconds: 600 },
      { kind: "text", text: " a " }, { kind: "temperature", text: "100°C" },
    ] });
    const chips = markup.slice(markup.indexOf('<div class="cook-video-chips">'));
    expect(chips.indexOf('aria-label="Siguiente paso"')).toBeLessThan(chips.indexOf("10 min"));
    expect(chips.indexOf("10 min")).toBeLessThan(chips.indexOf("Ingredientes"));
    expect(chips.indexOf("Ingredientes")).toBeLessThan(chips.indexOf("Pregúntale a Carmy"));
    expect(chips).toContain("bg-white text-ink");
    expect(chips).toContain("bg-[#1f1f22] text-white");
    expect(markup).toContain('class="text-white/60"');
    expect(markup).not.toContain("underline");
    expect(markup).not.toContain('aria-label="Crear temporizador');
  });

  it.each(["youtube", "tiktok"] as const)("retains the entire long step at a fixed readable type size for %s", (platform) => {
    const text = "Mezcla todos los ingredientes hasta incorporar. ".repeat(30);
    const markup = renderVideo({ platform, expanded: true, tokens: [{ kind: "text", text }] });
    expect(markup).toContain(`<span>${text}</span>`);
    expect(openingTag(markup, "div", "Texto del paso")).toContain("cook-video-caption");
    expect(markup).toContain("text-[22px] leading-[1.25]");
    expect(markup).toContain("pointer-events-none");
  });

  it("keeps TikTok's native URL across view and manual step changes", () => {
    const pip = renderVideo();
    const expanded = renderVideo({ expanded: true, startSeconds: 30, segmentEnd: 45, tokens: [{ kind: "text", text: "Forma las arepas." }] });
    expect(expanded.match(/<iframe[^>]*src="([^"]*)"/)?.[1]).toBe(pip.match(/<iframe[^>]*src="([^"]*)"/)?.[1]);
    expect(expanded).toContain("Forma las arepas.");
    expect(expanded).not.toContain("Mezcla la masa.");
    expect(expanded.match(/<iframe/g)).toHaveLength(1);
  });

  it("keeps YouTube's controlled playback overlay and PiP expand target", () => {
    const pip = renderVideo({ platform: "youtube" });
    expect(pip).toContain('data-native-controls="false"');
    expect(openingTag(pip, "button", "Abrir modo video")).toContain("inset-0");
    const expanded = renderVideo({ platform: "youtube", expanded: true });
    expect(expanded).toContain('aria-label="Reproducir video"');
    // No player time has arrived yet; step count must not drive YouTube's ring.
    expect(expanded).toContain('stroke-dashoffset="1"');
    expect(expanded).not.toContain("cook-video-native-guard");
  });
});
