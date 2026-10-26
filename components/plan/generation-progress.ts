export const GENERATION_STEPS = [
  "Leyendo tus gustos y tu cocina",
  "Escogiendo recetas para tu hogar",
  "Cuidando alergias y lo que no comes",
  "Cuadrando el mercado con tu presupuesto",
];

const STEP_DURATION_MS = 700;
const SUCCESS_DURATION_MS = 600;

/** Pace the presentation independently of the request, and dispose all work on unmount. */
export function trackGeneration(
  request: Promise<{ error?: string }>,
  { onStep, onError, onComplete }: {
    onStep: (step: number) => void;
    onError: (message: string) => void;
    onComplete: () => void | Promise<void>;
  },
) {
  let active = true;
  let ready = false;
  let paced = false;
  const timers: ReturnType<typeof setTimeout>[] = [];
  const schedule = (callback: () => void, delay: number) => {
    timers.push(setTimeout(callback, delay));
  };
  const dispose = () => {
    active = false;
    timers.forEach(clearTimeout);
  };
  const finish = () => {
    if (!active || !ready || !paced) return;
    onStep(GENERATION_STEPS.length);
    schedule(async () => {
      try {
        await onComplete();
      } catch {
        fail("No pudimos actualizar el plan. Intenta de nuevo.");
      }
    }, SUCCESS_DURATION_MS);
  };
  const fail = (message: string) => {
    if (!active) return;
    dispose();
    onError(message);
  };

  GENERATION_STEPS.slice(1).forEach((_, i) => {
    schedule(() => onStep(i + 1), (i + 1) * STEP_DURATION_MS);
  });
  schedule(() => {
    paced = true;
    finish();
  }, GENERATION_STEPS.length * STEP_DURATION_MS);

  request.then((result) => {
    if (result.error) {
      fail(result.error);
      return;
    }
    ready = true;
    finish();
  }, () => fail("No pudimos armar el plan. Intenta de nuevo."));

  return dispose;
}
