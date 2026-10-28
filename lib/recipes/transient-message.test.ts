import { afterEach, describe, expect, it, vi } from "vitest";
import { createTransientMessage } from "./transient-message";

afterEach(() => vi.useRealTimers());
describe("share confirmation lifetime", () => {
  it("dismisses after two seconds and restarts the lifetime on repeated taps", () => {
    vi.useFakeTimers();
    const publish = vi.fn();
    const message = createTransientMessage(publish);
    message.begin()("Enlace copiado");
    vi.advanceTimersByTime(1500);
    expect(publish).toHaveBeenLastCalledWith("Enlace copiado");
    message.begin()("Enlace copiado");
    vi.advanceTimersByTime(1999);
    expect(publish).toHaveBeenLastCalledWith("Enlace copiado");
    vi.advanceTimersByTime(1);
    expect(publish).toHaveBeenLastCalledWith(undefined);
  });
  it("clears timers on unmount and ignores stale clipboard promises", () => {
    vi.useFakeTimers();
    const publish = vi.fn();
    const message = createTransientMessage(publish);
    const stale = message.begin();
    message.begin()("Enlace copiado");
    stale("Mensaje viejo");
    expect(publish).toHaveBeenLastCalledWith("Enlace copiado");
    message.cancel();
    expect(vi.getTimerCount()).toBe(0);
    const pending = message.begin();
    message.cancel();
    publish.mockClear();
    pending("Enlace copiado");
    vi.runAllTimers();
    expect(publish).not.toHaveBeenCalled();
  });
});
