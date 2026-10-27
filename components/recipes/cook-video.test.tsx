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

describe("cook video native TikTok", () => {
  it("renders an interactive native iframe and a small expand button on the first PiP render", () => {
    const markup = renderVideo();
    expect(markup).toContain('data-native-controls="true"');
    const iframe = markup.match(/<iframe[^>]*>/)?.[0];
    expect(iframe).toContain("https://www.tiktok.com/player/v1/123?");
    expect(iframe).toContain("controls=1");
    expect(iframe).toContain("pointer-events-auto");
    expect(iframe).not.toContain('tabindex="-1"');
    const expand = openingTag(markup, "button", "Abrir modo video");
    expect(expand).toContain("btn-float");
    expect(expand).toContain("size-7");
    expect(expand).toContain("top-1 left-1");
    expect(expand).not.toContain("inset-0");
    expect(openingTag(markup, "button", "Ocultar video")).toContain("right-1");
  });

  it("keeps native playback accessible in modo video without a playback tap overlay", () => {
    const markup = renderVideo({ expanded: true });
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('data-native-controls="true"');
    expect(markup).not.toContain('aria-label="Reproducir video"');
    expect(markup).not.toContain('aria-label="Pausar video"');
    expect(openingTag(markup, "button", "Volver a los pasos")).not.toContain("invisible");
    expect(markup).toContain("Mezcla la masa.");
    expect(markup).toContain("Ingredientes");
  });

  it("keeps the same native URL across view and manual step changes", () => {
    const pip = renderVideo();
    const expanded = renderVideo({ expanded: true, startSeconds: 30, segmentEnd: 45, tokens: [{ kind: "text", text: "Forma las arepas." }] });
    expect(expanded.match(/<iframe[^>]*src="([^"]*)"/)?.[1]).toBe(pip.match(/<iframe[^>]*src="([^"]*)"/)?.[1]);
    expect(expanded).toContain("Forma las arepas.");
    expect(expanded).not.toContain("Mezcla la masa.");
  });

  it("keeps YouTube's controlled playback overlay and PiP expand target", () => {
    const pip = renderVideo({ platform: "youtube" });
    expect(pip).toContain('data-native-controls="false"');
    expect(openingTag(pip, "button", "Abrir modo video")).toContain("inset-0");
    expect(renderVideo({ platform: "youtube", expanded: true })).toContain('aria-label="Reproducir video"');
  });
});
